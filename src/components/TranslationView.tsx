import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Copy,
  Check,
  Volume2,
  X,
  Languages,
  CheckCircle2,
  Edit3,
  Columns,
  Rows,
  AlertCircle,
  Keyboard,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Language, TranslationResult, GrammarRule } from '../types/index.js';
import { safeFetchJson } from '../utils/api.js';
import { dynamicTranslateSentence } from '../utils/dynamicTranslator.js';
import { translateOnClient } from '../utils/clientGeminiTranslator.js';
import { VirtualKeyboard } from './VirtualKeyboard.js';

interface TranslationViewProps {
  onRuleInduced: (rule: GrammarRule) => void;
  activeRulesCount?: number;
  corpusCount?: number;
  docsCount?: number;
  onNavigateToTab?: (tab: 'translator' | 'admin' | 'knowledge' | 'rules') => void;
}

export const TranslationView: React.FC<TranslationViewProps> = ({
  onRuleInduced,
}) => {
  const [sourceLang, setSourceLang] = useState<Language>('english');
  const [targetLang, setTargetLang] = useState<Language>('brahui-arabic');
  const [sourceText, setSourceText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAltScript, setShowAltScript] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'stacked' | 'side-by-side'>('stacked');

  // Virtual Keyboard state (auto-detects sourceLang)
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(true);
  const [activeKeyboardLayout, setActiveKeyboardLayout] = useState<Language>('english');

  // Correction Panel State
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [selectedDialect, setSelectedDialect] = useState<'ساراوانی' | 'جالاوانی' | 'رخشانی'>('ساراوانی');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionSuccessMsg, setCorrectionSuccessMsg] = useState<string | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const isSourceArabic = sourceLang === 'brahui-arabic' || sourceLang === 'urdu';
  const isTargetArabic = targetLang === 'brahui-arabic' || targetLang === 'urdu';

  const sourceLanguages: { id: Language; label: string; native: string }[] = [
    { id: 'english', label: 'English', native: 'English' },
    { id: 'urdu', label: 'Urdu', native: 'اردو' },
    { id: 'brahui-arabic', label: 'Brahui', native: 'براہوئی' },
    { id: 'brahui-latin', label: 'Brahui (Latin)', native: 'Brolikwar' },
  ];

  const targetLanguages: { id: Language; label: string; native: string }[] = [
    { id: 'brahui-arabic', label: 'Brahui', native: 'براہوئی' },
    { id: 'brahui-latin', label: 'Brahui (Latin)', native: 'Brolikwar' },
    { id: 'urdu', label: 'Urdu', native: 'اردو' },
    { id: 'english', label: 'English', native: 'English' },
  ];

  // Auto-switch keyboard layout when source language changes
  const handleSelectSourceLang = (lang: Language) => {
    setSourceLang(lang);
    setActiveKeyboardLayout(lang);
  };

  // Safe character insertion at cursor position in textarea
  const handleInsertChar = (char: string) => {
    const textarea = document.getElementById('source-text-input') as HTMLTextAreaElement | null;
    if (!textarea) {
      setSourceText((prev) => prev + char);
      return;
    }
    const start = textarea.selectionStart ?? sourceText.length;
    const end = textarea.selectionEnd ?? sourceText.length;
    const newText = sourceText.substring(0, start) + char + sourceText.substring(end);
    setSourceText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + char.length, start + char.length);
    }, 10);
  };

  const handleTranslate = async () => {
    const textToTranslate = sourceText.trim();
    if (!textToTranslate) return;

    setIsTranslating(true);
    setCorrectionSuccessMsg(null);
    setCorrectionError(null);
    setTranslationError(null);

    const clientApiKey = (
      (import.meta.env.VITE_GEMINI_API_KEY as string) ||
      (import.meta.env.VITE_GOOGLE_API_KEY as string) ||
      ''
    ).trim();

    try {
      // 1. Send request to translation backend endpoint
      const res = await safeFetchJson<TranslationResult>('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clientApiKey ? { 'x-gemini-api-key': clientApiKey } : {}),
        },
        body: JSON.stringify({
          sourceText: textToTranslate,
          sourceLang,
          targetLang,
          apiKey: clientApiKey || undefined,
        }),
      });

      if (res.ok && res.data && res.data.translatedText) {
        setResult(res.data);
        setCorrectionText(res.data.translatedText);
        setTranslationError(null);
        return;
      }

      // 2. Client-side Gemini fallback if backend is unavailable
      if (clientApiKey) {
        try {
          const clientResult = await translateOnClient(textToTranslate, sourceLang, targetLang, clientApiKey);
          if (clientResult && clientResult.translatedText) {
            setResult(clientResult);
            setCorrectionText(clientResult.translatedText);
            setTranslationError(null);
            return;
          }
        } catch (clientErr) {
          console.warn('Client-side Gemini translation attempt error:', clientErr);
        }
      }

      if (!res.ok && res.error) {
        setTranslationError(res.error);
      }

      // 3. Fallback dynamically translates the ACTUAL input text sentence
      const dynamicFallback = dynamicTranslateSentence(textToTranslate, sourceLang, targetLang);
      setResult(dynamicFallback);
      setCorrectionText(dynamicFallback.translatedText);
    } catch (err: any) {
      console.error('Translation error:', err);
      if (clientApiKey) {
        try {
          const clientResult = await translateOnClient(textToTranslate, sourceLang, targetLang, clientApiKey);
          if (clientResult && clientResult.translatedText) {
            setResult(clientResult);
            setCorrectionText(clientResult.translatedText);
            setTranslationError(null);
            return;
          }
        } catch {}
      }

      setTranslationError(err?.message || 'Network error occurred during translation');
      const dynamicFallback = dynamicTranslateSentence(textToTranslate, sourceLang, targetLang);
      setResult(dynamicFallback);
      setCorrectionText(dynamicFallback.translatedText);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwapLanguages = () => {
    const prevSource = sourceLang;
    const prevTarget = targetLang;
    setSourceLang(prevTarget);
    setTargetLang(prevSource);
    setActiveKeyboardLayout(prevTarget);

    if (result?.translatedText) {
      setSourceText(result.translatedText);
      setResult(null);
      setCorrectionText('');
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = showAltScript && result.alternativeScript ? result.alternativeScript : result.translatedText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeech = (text: string, lang: Language) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === 'urdu' || lang === 'brahui-arabic') {
      utterance.lang = 'ur-PK';
    } else {
      utterance.lang = 'en-US';
    }
    window.speechSynthesis.speak(utterance);
  };

  const handleOpenCorrection = () => {
    if (!isCorrectionOpen && result?.translatedText) {
      setCorrectionText(result.translatedText);
    }
    setIsCorrectionOpen(!isCorrectionOpen);
    setCorrectionSuccessMsg(null);
    setCorrectionError(null);
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionText.trim()) {
      setCorrectionError('براہ کرم درست جملہ درج کریں۔ / Please type the corrected sentence.');
      return;
    }

    setIsSubmittingCorrection(true);
    setCorrectionError(null);

    try {
      const res = await safeFetchJson<any>('/api/corrections/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: result ? result.sourceText : sourceText.trim(),
          sourceLang,
          targetLang,
          initialTranslation: result ? result.translatedText : '',
          correctedTranslation: correctionText.trim(),
          dialect: selectedDialect,
          contributorName: 'Community Contributor',
          contributorRole: 'User',
        }),
      });

      if (!res.ok) {
        throw new Error(res.error || 'Failed to submit correction');
      }

      const data = res.data || {};

      // If user result, update displayed text with bracketed dialect indicator
      const dialectSuffix = ` (${selectedDialect})`;
      const displayedCorrection = correctionText.includes('(') ? correctionText.trim() : `${correctionText.trim()}${dialectSuffix}`;

      if (result) {
        setResult({
          ...result,
          translatedText: displayedCorrection,
          confidence: 99,
        });
      } else {
        setResult({
          sourceText,
          sourceLang,
          targetLang,
          translatedText: displayedCorrection,
          confidence: 99,
        });
      }

      if (data.inducedRule) {
        onRuleInduced(data.inducedRule);
      }

      if (data.requiresApproval) {
        setCorrectionSuccessMsg(
          data.message ||
          'تصحیح موصول ہو گئی۔ ایڈمن کی منظوری کے بعد یہ باقاعدہ فعال ہو جائے گی۔ (Correction queued for Admin Review and will become active once approved)'
        );
      } else {
        setCorrectionSuccessMsg('ترجمہ کامیابی سے درست ہو گیا! ماڈل نے نیا اصول سیکھ لیا۔ (Correction learned)');
      }

      setTimeout(() => {
        setIsCorrectionOpen(false);
        setCorrectionSuccessMsg(null);
      }, 3500);
    } catch (err: any) {
      console.error('Correction submission error:', err);
      setCorrectionError(err.message || 'تصحیح جمع کرنے میں مسئلہ پیش آیا۔');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-4">
      {/* View Switcher & Translation Engine Status */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
        <span className="font-medium text-slate-600">Brahui Translate Engine • Active Learning System</span>
        <button
          type="button"
          onClick={() => setLayoutMode(layoutMode === 'stacked' ? 'side-by-side' : 'stacked')}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-200/70 text-slate-600 transition-colors cursor-pointer"
          title="Toggle between Stacked and Side-by-Side view"
        >
          {layoutMode === 'stacked' ? (
            <>
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-side View</span>
            </>
          ) : (
            <>
              <Rows className="w-3.5 h-3.5" />
              <span>Stacked View</span>
            </>
          )}
        </button>
      </div>

      {/* Main Translation Container */}
      <div className={`grid gap-4 ${layoutMode === 'side-by-side' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* ================= 1. SOURCE LANGUAGE BOX (ON TOP) ================= */}
        <div className="bg-white border border-slate-300 rounded-2xl shadow-xs overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 transition-all">
          {/* Source Language Header Tabs */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 border-b border-slate-200 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {sourceLanguages.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => handleSelectSourceLang(lang.id)}
                  className={`px-3 py-1.5 rounded-md font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                    sourceLang === lang.id
                      ? 'bg-blue-50 text-blue-600 font-semibold border-b-2 border-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwapLanguages}
              aria-label="Swap Languages"
              title="Swap languages"
              className="p-1.5 rounded-full text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 ml-1"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Source Text Area */}
          <div className="relative p-4 flex-1 flex flex-col min-h-[160px]">
            <textarea
              id="source-text-input"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleTranslate();
                }
              }}
              dir={isSourceArabic ? 'rtl' : 'ltr'}
              placeholder="Welcome to Brahui translator"
              rows={4}
              className={`w-full flex-1 border-0 focus:ring-0 focus:outline-hidden resize-none text-slate-800 placeholder-slate-400 bg-transparent ${
                isSourceArabic
                  ? 'font-nastaliq text-2xl leading-[2.3] text-right'
                  : 'font-sans text-lg sm:text-xl'
              }`}
            />

            {/* Dynamic Virtual Keyboard Embedded inside Source Box */}
            {showVirtualKeyboard && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <VirtualKeyboard
                  mode={activeKeyboardLayout}
                  onInsertChar={handleInsertChar}
                  onLayoutChange={setActiveKeyboardLayout}
                />
              </div>
            )}

            {/* Source Box Bottom Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-slate-400 text-xs">
              <div className="flex items-center gap-1.5">
                {sourceText.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSpeech(sourceText, sourceLang)}
                    title="Listen to source text"
                    className="p-1.5 rounded-full hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}

                {/* Keyboard Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
                  className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                    showVirtualKeyboard
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-slate-100 text-slate-500'
                  }`}
                  title="Toggle Virtual On-Screen Keyboard"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>{showVirtualKeyboard ? 'Hide Keyboard' : 'On-Screen Keyboard'}</span>
                  {showVirtualKeyboard ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span>{sourceText.length} / 5,000</span>
                {sourceText && (
                  <button
                    type="button"
                    onClick={() => setSourceText('')}
                    title="Clear text"
                    className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= CONTROLS ROW: PRIMARY TRANSLATE BUTTON ================= */}
        <div className={`flex items-center justify-center py-1 ${layoutMode === 'side-by-side' ? 'md:col-span-2' : ''}`}>
          <button
            type="button"
            id="translate-button"
            onClick={handleTranslate}
            disabled={isTranslating || !sourceText.trim()}
            className="px-8 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium text-sm rounded-full shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isTranslating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>ترجمہ ہو رہا ہے... / Translating...</span>
              </>
            ) : (
              <>
                <Languages className="w-4 h-4" />
                <span>Translate / ترجمہ کریں</span>
              </>
            )}
          </button>
        </div>

        {/* ================= 2. TRANSLATED BRAHUI BOX (AT THE BOTTOM) ================= */}
        <div className="flex flex-col gap-3">
          {translationError && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-amber-950">Notice: </span>
                <span>{translationError}</span>
                <span className="block text-amber-700/80 mt-0.5">Showing dynamic active-rule translation for your input.</span>
              </div>
              <button
                type="button"
                onClick={() => setTranslationError(null)}
                className="text-amber-600 hover:text-amber-800 p-0.5 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="bg-[#f8f9fa] border border-slate-300 rounded-2xl shadow-xs overflow-hidden flex flex-col transition-all">
            {/* Target Language Header Tabs */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-100/80 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {targetLanguages.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setTargetLang(lang.id)}
                    className={`px-3 py-1.5 rounded-md font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                      targetLang === lang.id
                        ? 'bg-white text-blue-600 font-semibold border-b-2 border-blue-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {/* Script Toggle for Brahui */}
              {result?.alternativeScript && (
                <button
                  type="button"
                  onClick={() => setShowAltScript(!showAltScript)}
                  className="text-[11px] text-blue-700 hover:text-blue-900 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  {showAltScript ? 'Primary Script' : 'Parallel Script'}
                </button>
              )}
            </div>

            {/* Translated Output Display Area with Professional Nastaliq Font */}
            <div className="relative p-4 flex-1 flex flex-col justify-between min-h-[160px]">
              {isTranslating ? (
                <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Translating to {targetLang}...</span>
                </div>
              ) : result ? (
                <div>
                  {/* Multi-Dialect Formatted Translation Output */}
                  <div
                    id="translated-text-output"
                    dir={isTargetArabic && !showAltScript ? 'rtl' : !isTargetArabic && showAltScript ? 'rtl' : 'ltr'}
                    className={`select-text whitespace-pre-wrap ${
                      (isTargetArabic && !showAltScript) || (!isTargetArabic && showAltScript)
                        ? 'font-nastaliq text-2xl sm:text-3xl text-slate-900 font-normal leading-[2.3] text-right py-1'
                        : 'font-sans text-xl sm:text-2xl text-slate-900 font-normal leading-relaxed'
                    }`}
                  >
                    {showAltScript ? result.alternativeScript : result.translatedText}
                  </div>

                  {/* Multi-Dialect Individual Cards for convenient inspection and copying */}
                  {result.dialectVariants && result.dialectVariants.length > 1 && (
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                        <span>لہجہ وار ترجمے (Dialect Variations):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {result.dialectVariants.map((variant, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                {variant.dialect}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${variant.text} (${variant.dialect})`);
                                }}
                                title="Copy dialect translation"
                                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div
                              className="font-nastaliq text-xl text-slate-900 text-right leading-loose mt-1"
                              dir="rtl"
                            >
                              {variant.text}
                            </div>
                            {variant.alternativeScript && (
                              <div className="text-xs text-slate-500 mt-1 font-mono">
                                {variant.alternativeScript}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 font-normal text-lg sm:text-xl italic select-none">
                  {isTargetArabic ? 'ترجمہ...' : 'Translation...'}
                </div>
              )}

              {/* Target Box Bottom Toolbar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 text-slate-500 text-xs mt-4">
                <div className="flex items-center gap-2">
                  {result?.translatedText && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleSpeech(
                            showAltScript && result.alternativeScript
                              ? result.alternativeScript
                              : result.translatedText,
                            targetLang
                          )
                        }
                        title="Listen to translation"
                        className="p-1.5 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleCopy}
                        title="Copy translation"
                        className="p-1.5 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        {copied && <span className="text-[11px] text-emerald-600 font-medium">Copied!</span>}
                      </button>
                    </>
                  )}
                </div>

                {result && (
                  <div className="text-[11px] text-slate-400">
                    {result.wordCount ? `${result.wordCount} words` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= RELOCATED CORRECTION BUTTON DIRECTLY UNDERNEATH TRANSLATED RESULT ================= */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <button
                type="button"
                id="toggle-correction-btn"
                onClick={handleOpenCorrection}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
                  isCorrectionOpen
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white hover:bg-blue-50 text-blue-700 border-slate-300 hover:border-blue-400'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>ترجمہ درست کریں (Correct Translation)</span>
              </button>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                ترجمہ میں کوئی غلطی ہو تو یہاں کلک کر کے فوری تصحیح درج کریں
              </span>
            </div>

            {/* CORRECTION PANEL WITH DIALECT SELECTION */}
            {isCorrectionOpen && (
              <div
                id="minimal-correction-panel"
                className="bg-white border-2 border-blue-500 rounded-2xl p-4 shadow-md transition-all animate-in fade-in-50 duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">
                    درست براہوئی جملہ درج کریں (Correct Brahui Translation):
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCorrectionOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
                    title="Cancel / Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmitCorrection} className="space-y-3">
                  {/* DIALECT SELECTION DROPDOWN */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <label htmlFor="correction-dialect-select" className="text-xs font-semibold text-slate-700">
                      براہوئی لہجہ منتخب کریں (Select Brahui Dialect):
                    </label>
                    <select
                      id="correction-dialect-select"
                      value={selectedDialect}
                      onChange={(e) => setSelectedDialect(e.target.value as any)}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="ساراوانی">Sarawani (ساراوانی)</option>
                      <option value="جالاوانی">Jhalawani (جالاوانی)</option>
                      <option value="رخشانی">Rakhshani (رخشانی)</option>
                    </select>
                  </div>

                  {/* Clean Text box to type the corrected Brahui sentence in Nastaliq font */}
                  <div>
                    <textarea
                      id="corrected-sentence-input"
                      rows={3}
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      dir={isTargetArabic ? 'rtl' : 'ltr'}
                      placeholder="درست براہوئی جملہ یہاں لکھیں... (Type corrected Brahui sentence here...)"
                      className={`w-full p-3.5 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none ${
                        isTargetArabic ? 'font-nastaliq text-2xl leading-[2.3] text-right' : 'font-sans text-base'
                      }`}
                      autoFocus
                    />
                  </div>

                  {correctionError && (
                    <div className="text-xs text-rose-600 font-medium">
                      {correctionError}
                    </div>
                  )}

                  {correctionSuccessMsg && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{correctionSuccessMsg}</span>
                    </div>
                  )}

                  {/* Simple "Submit Correction" button */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <span className="text-[11px] text-slate-500">
                      ایڈمن کی تصدیق کے بعد یہ اصول ڈیٹا بیس میں مستقل محفوظ ہوگا۔
                    </span>
                    <button
                      type="submit"
                      id="submit-correction-button"
                      disabled={isSubmittingCorrection || !correctionText.trim()}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {isSubmittingCorrection ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>جمع ہو رہا ہے...</span>
                        </>
                      ) : (
                        <span>Submit Correction / تصحیح جمع کریں</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

