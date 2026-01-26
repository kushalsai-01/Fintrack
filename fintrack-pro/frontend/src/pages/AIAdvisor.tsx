import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Send,
  Bot,
  User,
  Sparkles,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Target,
  Lightbulb,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner, TypingIndicator } from '@/components/ui/Loading';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { formatCurrency, cn } from '@/lib/utils';
import type { FinancialHealth, MonthlySummary, Goal } from '@shared/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationContext {
  summary?: MonthlySummary;
  healthScore?: FinancialHealth;
  goals?: Goal[];
}

const SUGGESTED_PROMPTS = [
  {
    icon: TrendingUp,
    title: 'Spending Analysis',
    prompt: 'Analyze my spending patterns and suggest areas where I can cut back',
  },
  {
    icon: PiggyBank,
    title: 'Savings Strategy',
    prompt: 'Help me create a savings plan to reach my financial goals faster',
  },
  {
    icon: CreditCard,
    title: 'Debt Payoff',
    prompt: 'What\'s the best strategy to pay off my debts?',
  },
  {
    icon: Target,
    title: 'Goal Planning',
    prompt: 'How can I better allocate my income to achieve my goals?',
  },
  {
    icon: Lightbulb,
    title: 'Investment Advice',
    prompt: 'What should I consider before starting to invest?',
  },
  {
    icon: Sparkles,
    title: 'Financial Health',
    prompt: 'Give me a comprehensive analysis of my financial health',
  },
];

export default function AIAdvisor() {
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello ${user?.firstName || 'there'}! 👋 I'm your AI Financial Advisor. I have access to your financial data and can provide personalized insights and recommendations.\n\nHow can I help you today? You can ask me about:\n- Spending analysis and optimization\n- Savings strategies\n- Debt payoff plans\n- Goal planning\n- Investment basics\n- And much more!`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Fetch context data
  const { data: summary } = useQuery({
    queryKey: ['monthly-summary'],
    queryFn: () => api.get<MonthlySummary>('/analytics/monthly'),
  });

  const { data: healthScore } = useQuery({
    queryKey: ['health-score'],
    queryFn: () => api.get<FinancialHealth>('/health/latest'),
  });

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get<Goal[]>('/goals?status=active'),
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const context: ConversationContext = {
        summary,
        healthScore,
        goals,
      };
      return api.post<{ response: string }>('/ai/chat', {
        message,
        context,
        conversationHistory: messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    },
    onError: () => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsTyping(false);
    },
  });

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // Send message
  const sendMessage = (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    chatMutation.mutate(content.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const copyToClipboard = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
            <Bot className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              AI Financial Advisor
              <Sparkles className="h-5 w-5 text-warning" />
            </h1>
            <p className="text-muted-foreground">
              Powered by advanced AI for personalized financial guidance
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            onScroll={handleScroll}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg p-4 group relative',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  <div
                    className={cn(
                      'text-xs mt-2',
                      message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background/50"
                    >
                      {copiedId === message.id ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <TypingIndicator />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}

          {/* Input */}
          <div className="flex-shrink-0 border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything about your finances..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button type="submit" disabled={!inputValue.trim() || isTyping}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 space-y-4 hidden lg:block">
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Your Financial Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthScore && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">Health Score</span>
                  <Badge
                    variant={
                      healthScore.overallScore >= 80
                        ? 'success'
                        : healthScore.overallScore >= 60
                        ? 'warning'
                        : 'destructive'
                    }
                  >
                    {healthScore.overallScore}/100
                  </Badge>
                </div>
              )}
              {summary && (
                <>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Monthly Income</span>
                    <span className="text-sm font-medium text-success">
                      {formatCurrency(summary.income)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Monthly Expenses</span>
                    <span className="text-sm font-medium text-destructive">
                      {formatCurrency(summary.expense)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Savings Rate</span>
                    <span className="text-sm font-medium">
                      {summary.savingsRate?.toFixed(1)}%
                    </span>
                  </div>
                </>
              )}
              {goals && goals.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">Active Goals</span>
                  <span className="text-sm font-medium">{goals.length}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggested Prompts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Suggested Questions</CardTitle>
              <CardDescription className="text-xs">
                Click to ask the AI advisor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedPrompt(prompt.prompt)}
                  disabled={isTyping}
                  className={cn(
                    'w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors',
                    'hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed',
                    'border border-transparent hover:border-border'
                  )}
                >
                  <prompt.icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{prompt.title}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Pro Tip</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Be specific with your questions to get more detailed and actionable advice.
                    For example, instead of "How can I save more?", try "How can I reduce my food
                    expenses while maintaining a healthy diet?"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
