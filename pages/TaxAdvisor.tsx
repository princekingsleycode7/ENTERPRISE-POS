/**
 * pages/TaxAdvisor.tsx [Phase 2 Update]
 * 
 * Full-page Tax Advisor component with chat interface, voice I/O, and tax health dashboard
 * Features: Text/voice input, voice output, tax snapshot, health score, deadline tracking
 * Role-based access control (manager/admin only)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Send, AlertCircle, Calculator, Clock, FileText, Bot, Wifi, WifiOff, Mic, Volume2, VolumeX, Square } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { TaxMessage } from '../types';
import { sendTaxMessage, formatMessage, formatNaira, daysUntilDeadline, getTaxSnapshot } from '../services/tax/taxAgentService';
import { TaxHealthDashboard } from '../components/tax/TaxHealthDashboard';
import { Spinner } from '../components/common/Spinner';

interface TaxSnapshot {
  currentMonthVAT: number;
  yearToDateCIT: number;
  nextFIRSDeadline: {
    type: 'VAT' | 'CIT' | 'PAYE';
    date: string;
    daysUntil: number;
  };
}

// Type definitions for Web Speech API (for browsers without full TypeScript support)
declare global {
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly length: number;
    readonly isFinal: boolean;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export const TaxAdvisor: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const isOnline = useNetworkStatus();
  const [conversationHistory, setConversationHistory] = useState<TaxMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [taxSnapshot, setTaxSnapshot] = useState<TaxSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Input States
  const [isRecording, setIsRecording] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Voice Output States
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check permissions - only manager and admin can access
  const canAccess = hasPermission('manage_settings') || hasPermission('manage_employees');

  if (!canAccess) {
    return <Navigate to="/pos" replace />;
  }

  // Initialize Speech Recognition and Synthesis on mount
  useEffect(() => {
    // Check Speech Recognition support
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setSpeechRecognitionSupported(true);
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.lang = 'en-NG';
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setInputValue(prev => prev + transcript);
          } else {
            interimTranscript += transcript;
          }
        }
        if (interimTranscript) {
          setInputValue(currentInput => currentInput.split(' ').slice(0, -1).join(' ') + ' ' + interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    // Load voice preference from localStorage
    const savedVoicePreference = localStorage.getItem('tax-advisor-voice-enabled');
    if (savedVoicePreference === 'true') {
      setVoiceEnabled(true);
    }
  }, []);

  // Fetch tax snapshot on mount
  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const snapshot = await getTaxSnapshot();
        setTaxSnapshot(snapshot);
      } catch (error) {
        console.error('Failed to fetch tax snapshot:', error);
      } finally {
        setSnapshotLoading(false);
      }
    };

    if (isOnline) {
      fetchSnapshot();
    } else {
      setSnapshotLoading(false);
    }
  }, [isOnline]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, isLoading]);

  // Speak text using Web Speech Synthesis API
  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) {
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    // Strip markdown formatting from text
    const cleanText = text
      .replace(/\*\*|\*|__|\*\*\*/g, '') // Remove bold/italic markers
      .replace(/#{1,6}\s/g, '') // Remove heading markers
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to plain text
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Select voice (prefer en-GB or en-NG)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      voice =>
        voice.lang.includes('en-GB') ||
        voice.lang.includes('en-NG') ||
        voice.lang.includes('en-ZA')
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
    };

    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !isOnline || isLoading) {
      return;
    }

    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Add user message to history
    const userMsg = formatMessage('user', inputValue);
    const updatedHistory = [...conversationHistory, userMsg];
    setConversationHistory(updatedHistory);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the tax agent service
      const response = await sendTaxMessage(inputValue, user?.id || '', conversationHistory);

      // Add assistant response to history
      const assistantMsg = formatMessage('assistant', response);
      setConversationHistory(prev => [...prev, assistantMsg]);

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speakText(response);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = formatMessage(
        'assistant',
        `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      );
      setConversationHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && isOnline) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setInputValue(''); // Clear input when starting new recording
      recognitionRef.current.start();
    }
  };

  const toggleVoiceOutput = () => {
    const newVoiceState = !voiceEnabled;
    setVoiceEnabled(newVoiceState);
    localStorage.setItem('tax-advisor-voice-enabled', String(newVoiceState));
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleQuickAction = (question: string) => {
    setInputValue(question);
    // Auto-send after state updates
    setTimeout(() => {
      // Trigger send manually since state hasn't updated yet
      const autoSend = async () => {
        setIsLoading(true);
        try {
          const response = await sendTaxMessage(question, user?.id || '', conversationHistory);
          const userMsg = formatMessage('user', question);
          const assistantMsg = formatMessage('assistant', response);
          setConversationHistory(prev => [...prev, userMsg, assistantMsg]);

          if (voiceEnabled) {
            speakText(response);
          }
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setIsLoading(false);
          setInputValue('');
        }
      };
      autoSend();
    }, 100);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Tax Health Dashboard & Tax Snapshot */}
      <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6">
          {/* Tax Health Dashboard */}
          {isOnline && !snapshotLoading && taxSnapshot && (
            <div className="mb-8">
              <TaxHealthDashboard
                currentMonthVAT={taxSnapshot.currentMonthVAT}
                yearToDateCIT={taxSnapshot.yearToDateCIT}
                onQuickAction={handleQuickAction}
              />
            </div>
          )}

          {/* Tax Snapshot */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calculator className="text-blue-600" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tax Snapshot</h1>
                <p className="text-xs text-gray-500">Current period overview</p>
              </div>
            </div>

            {snapshotLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : !isOnline ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-orange-700 mb-2">
                  <WifiOff size={16} />
                  <span className="text-sm font-medium">Offline Mode</span>
                </div>
                <p className="text-xs text-orange-600">
                  Tax Advisor requires internet connection for real-time data.
                </p>
              </div>
            ) : taxSnapshot ? (
              <div className="space-y-4">
                {/* Current Month VAT */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Current Month VAT</span>
                    <FileText size={16} className="text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatNaira(taxSnapshot.currentMonthVAT)}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">VAT collected (7.5%)</p>
                </div>

                {/* Year-to-Date CIT */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">YTD Estimated CIT</span>
                    <Calculator size={16} className="text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatNaira(taxSnapshot.yearToDateCIT)}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">Company Income Tax (estimated)</p>
                </div>

                {/* Next FIRS Deadline */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Next Deadline</span>
                    <Clock size={16} className="text-red-600" />
                  </div>
                  <p className="text-lg font-bold text-red-900">
                    {taxSnapshot.nextFIRSDeadline.type === 'VAT' && '21st of Month'}
                    {taxSnapshot.nextFIRSDeadline.type === 'CIT' && '6 Months After Year-End'}
                    {taxSnapshot.nextFIRSDeadline.type === 'PAYE' && '10th of Month'}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    {taxSnapshot.nextFIRSDeadline.daysUntil} days remaining
                  </p>
                </div>
              </div>
            ) : null}

            {/* Offline Notice */}
            {!isOnline && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">Limited Functionality</span>
                </div>
                <p className="text-xs text-amber-600">
                  Tax Advisor requires an internet connection to provide guidance based on your live business data.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-white">
        {/* Header with Voice Toggle */}
        <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-medium text-red-700 transition-colors flex items-center gap-2"
              >
                <Square size={14} />
                Stop Speaking
              </button>
            )}
            <button
              onClick={toggleVoiceOutput}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                voiceEnabled
                  ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700'
                  : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700'
              }`}
            >
              {voiceEnabled ? (
                <>
                  <Volume2 size={14} />
                  Voice On
                </>
              ) : (
                <>
                  <VolumeX size={14} />
                  Voice Off
                </>
              )}
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {conversationHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Bot className="text-blue-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tax Advisor</h2>
                <p className="text-gray-600 max-w-md">
                  Ask me about VAT registration, CIT rates, deductible expenses, PAYE,
                  or any Nigerian tax compliance question. I have access to your real business data.
                </p>
                <div className="mt-6 space-y-2 text-sm text-gray-500">
                  <p>💡 Example questions:</p>
                  <ul className="space-y-1">
                    <li>"Do we need to register for VAT?"</li>
                    <li>"What's our estimated tax liability?"</li>
                    <li>"Which expenses are tax deductible?"</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            conversationHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md px-4 py-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Bot size={16} />
                      <span className="text-xs font-semibold">Tax Advisor</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 rounded-lg rounded-bl-none px-4 py-3">
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span className="text-sm text-gray-600">Tax Advisor is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {!isOnline ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-orange-700 mb-2">
                <WifiOff size={18} />
                <span className="font-medium">Offline Mode</span>
              </div>
              <p className="text-sm text-orange-600">
                Tax Advisor is only available online. Check your internet connection.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a tax question (e.g., VAT registration, deductible expenses, tax liability)..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
                {speechRecognitionSupported && (
                  <button
                    onClick={toggleRecording}
                    disabled={isLoading}
                    className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                        : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={isRecording ? 'Recording... click to stop' : 'Click to start voice input'}
                  >
                    <Mic size={18} />
                  </button>
                )}
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={18} />
                  Send
                </button>
              </div>

              {/* Recording Indicator */}
              {isRecording && (
                <div className="text-xs text-red-600 flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                  Recording... speaking now
                </div>
              )}
            </div>
          )}

          {/* Status Indicator */}
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
            {isOnline ? (
              <>
                <Wifi size={14} className="text-green-600" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-red-600" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
