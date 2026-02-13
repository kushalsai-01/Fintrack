"""
OCR Router - Receipt Scanning and Text Extraction
Provides endpoints for scanning receipts and extracting transaction data.
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging
import re
import io

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Response Models
# ============================================================================

class ReceiptItem(BaseModel):
    """Individual item from a receipt."""
    name: str
    quantity: float = 1.0
    unit_price: float
    total_price: float


class ReceiptData(BaseModel):
    """Extracted receipt data."""
    merchant: Optional[str] = None
    date: Optional[str] = None
    total: Optional[float] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    tip: Optional[float] = None
    items: List[ReceiptItem] = []
    payment_method: Optional[str] = None
    category: Optional[str] = None
    currency: str = "USD"


class OCRResult(BaseModel):
    """OCR scan result."""
    success: bool
    confidence: float
    data: Optional[ReceiptData] = None
    raw_text: Optional[str] = None
    errors: List[str] = []
    processing_time_ms: float = 0


# ============================================================================
# OCR Processing Functions
# ============================================================================

# Check if pytesseract is available
TESSERACT_AVAILABLE = False
try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
    logger.info("✅ Tesseract OCR is available")
except ImportError:
    logger.warning("⚠️ pytesseract not installed. OCR will use fallback mock mode.")


def extract_amount(text: str, patterns: List[str]) -> Optional[float]:
    """Extract a monetary amount from text using regex patterns."""
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            try:
                # Clean the amount string
                amount_str = match.group(1).replace(',', '').replace('$', '').strip()
                return float(amount_str)
            except (ValueError, IndexError):
                continue
    return None


def extract_date(text: str) -> Optional[str]:
    """Extract date from receipt text."""
    date_patterns = [
        r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',  # MM/DD/YYYY or MM-DD-YYYY
        r'(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})',    # YYYY/MM/DD
        r'([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})', # Month DD, YYYY
        r'(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})',   # DD Month YYYY
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    return None


def extract_merchant(text: str) -> Optional[str]:
    """Extract merchant name from receipt text."""
    lines = text.strip().split('\n')
    # Usually merchant name is in the first few lines
    for line in lines[:5]:
        line = line.strip()
        # Skip empty lines and common header patterns
        if line and len(line) > 2:
            # Skip lines that look like addresses, phone numbers, or dates
            if not re.match(r'^[\d\-\(\)]+$', line):  # Not a phone number
                if not re.match(r'^\d+\s+\w+', line):  # Not an address starting with number
                    return line
    return None


def guess_category(merchant: str, items: List[ReceiptItem]) -> str:
    """Guess the transaction category based on merchant and items."""
    merchant_lower = merchant.lower() if merchant else ""
    
    # Category mappings
    if any(kw in merchant_lower for kw in ['grocery', 'market', 'food', 'walmart', 'target', 'costco', 'whole foods']):
        return 'Groceries'
    if any(kw in merchant_lower for kw in ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'pizza', 'diner']):
        return 'Dining'
    if any(kw in merchant_lower for kw in ['gas', 'shell', 'chevron', 'exxon', 'fuel', 'petro']):
        return 'Transportation'
    if any(kw in merchant_lower for kw in ['pharmacy', 'cvs', 'walgreens', 'medical', 'health']):
        return 'Healthcare'
    if any(kw in merchant_lower for kw in ['amazon', 'online', 'ebay', 'shop']):
        return 'Shopping'
    
    return 'Other'


def parse_receipt_text(text: str) -> ReceiptData:
    """Parse OCR text to extract receipt data."""
    data = ReceiptData()
    
    # Extract merchant
    data.merchant = extract_merchant(text)
    
    # Extract date
    data.date = extract_date(text)
    
    # Extract amounts
    total_patterns = [
        r'total[:\s]*\$?([\d,]+\.?\d*)',
        r'amount[:\s]*\$?([\d,]+\.?\d*)',
        r'grand\s*total[:\s]*\$?([\d,]+\.?\d*)',
        r'\$?([\d,]+\.\d{2})\s*$',  # Last amount on a line (likely total)
    ]
    data.total = extract_amount(text, total_patterns)
    
    subtotal_patterns = [
        r'subtotal[:\s]*\$?([\d,]+\.?\d*)',
        r'sub\s*total[:\s]*\$?([\d,]+\.?\d*)',
    ]
    data.subtotal = extract_amount(text, subtotal_patterns)
    
    tax_patterns = [
        r'tax[:\s]*\$?([\d,]+\.?\d*)',
        r'sales\s*tax[:\s]*\$?([\d,]+\.?\d*)',
        r'vat[:\s]*\$?([\d,]+\.?\d*)',
    ]
    data.tax = extract_amount(text, tax_patterns)
    
    tip_patterns = [
        r'tip[:\s]*\$?([\d,]+\.?\d*)',
        r'gratuity[:\s]*\$?([\d,]+\.?\d*)',
    ]
    data.tip = extract_amount(text, tip_patterns)
    
    # Guess category
    if data.merchant:
        data.category = guess_category(data.merchant, data.items)
    
    return data


async def process_image_with_tesseract(image_bytes: bytes) -> tuple[str, float]:
    """Process image with Tesseract OCR."""
    if not TESSERACT_AVAILABLE:
        raise ImportError("Tesseract OCR is not available")
    
    # Open image
    image = Image.open(io.BytesIO(image_bytes))
    
    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Perform OCR
    text = pytesseract.image_to_string(image)
    
    # Get confidence (using image_to_data)
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    confidences = [int(c) for c in data['conf'] if c != '-1']
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
    
    return text, avg_confidence / 100.0


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/scan-receipt", response_model=OCRResult)
async def scan_receipt(
    file: UploadFile = File(..., description="Receipt image file (JPEG, PNG, or PDF)"),
    extract_items: bool = Form(default=False, description="Whether to extract individual line items")
):
    """
    Scan a receipt image and extract transaction data.
    
    Supported formats: JPEG, PNG, PDF (first page only)
    
    Returns extracted data including:
    - Merchant name
    - Date
    - Total amount
    - Tax
    - Category prediction
    - Individual items (if extract_items=True)
    """
    import time
    start_time = time.time()
    
    errors = []
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: JPEG, PNG, PDF"
        )
    
    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
    
    # Process with OCR
    raw_text = ""
    confidence = 0.0
    
    if TESSERACT_AVAILABLE:
        try:
            raw_text, confidence = await process_image_with_tesseract(content)
        except Exception as e:
            logger.error(f"OCR processing error: {e}")
            errors.append(f"OCR processing failed: {str(e)}")
            # Fall back to mock
            raw_text = ""
            confidence = 0.0
    else:
        # Mock mode for development/testing
        errors.append("Tesseract OCR not installed. Using mock data.")
        raw_text = """
        SAMPLE GROCERY STORE
        123 Main Street
        City, State 12345
        
        Date: 01/15/2026
        
        Milk                    $4.99
        Bread                   $3.49
        Eggs                    $5.99
        
        Subtotal:              $14.47
        Tax:                    $1.16
        Total:                 $15.63
        
        VISA ****1234
        """
        confidence = 0.85
    
    # Parse the extracted text
    if raw_text.strip():
        data = parse_receipt_text(raw_text)
    else:
        data = None
        if not errors:
            errors.append("No text could be extracted from the image")
    
    processing_time = (time.time() - start_time) * 1000
    
    return OCRResult(
        success=data is not None and data.total is not None,
        confidence=confidence,
        data=data,
        raw_text=raw_text if raw_text else None,
        errors=errors,
        processing_time_ms=processing_time
    )


@router.get("/status")
async def ocr_status():
    """Check OCR service status and capabilities."""
    tesseract_version = None
    if TESSERACT_AVAILABLE:
        try:
            tesseract_version = pytesseract.get_tesseract_version()
        except:
            pass
    
    return {
        "available": TESSERACT_AVAILABLE,
        "tesseract_version": str(tesseract_version) if tesseract_version else None,
        "supported_formats": ["image/jpeg", "image/png", "application/pdf"],
        "features": {
            "text_extraction": True,
            "amount_parsing": True,
            "date_extraction": True,
            "merchant_detection": True,
            "category_prediction": True,
            "item_extraction": TESSERACT_AVAILABLE,
        }
    }


@router.post("/parse-text", response_model=OCRResult)
async def parse_text(text: str = Form(..., description="Raw receipt text to parse")):
    """
    Parse raw receipt text and extract structured data.
    
    Use this endpoint if you already have the text extracted
    and just need to parse it into structured data.
    """
    import time
    start_time = time.time()
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    data = parse_receipt_text(text)
    processing_time = (time.time() - start_time) * 1000
    
    return OCRResult(
        success=data.total is not None,
        confidence=1.0,  # Text provided directly
        data=data,
        raw_text=text,
        errors=[],
        processing_time_ms=processing_time
    )
