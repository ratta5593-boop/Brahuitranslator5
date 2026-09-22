import React from 'react';
import { Keyboard, Sparkles, Globe } from 'lucide-react';
import { Language } from '../types/index.js';

interface VirtualKeyboardProps {
  mode: Language | 'arabic' | 'latin';
  onInsertChar: (char: string) => void;
  onLayoutChange?: (layout: Language) => void;
}

interface KeyChar {
  char: string;
  label: string;
  desc: string;
  special?: boolean;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  mode,
  onInsertChar,
  onLayoutChange,
}) => {
  // Normalize mode to one of our 4 language layouts
  let activeLayout: Language = 'brahui-arabic';
  if (mode === 'brahui-latin' || mode === 'latin') {
    activeLayout = 'brahui-latin';
  } else if (mode === 'urdu') {
    activeLayout = 'urdu';
  } else if (mode === 'english') {
    activeLayout = 'english';
  } else {
    activeLayout = 'brahui-arabic';
  }

  // 1. Brahui Perso-Arabic Character Set
  const brahuiArabicChars: KeyChar[] = [
    { char: 'ݪ', label: 'ݪ', desc: 'Brahui Voiceless Lateral Fricative (lh) - Unique Brahui Letter', special: true },
    { char: 'ڑ', label: 'ڑ', desc: 'Retroflex flap r' },
    { char: 'ٹ', label: 'ٹ', desc: 'Retroflex t' },
    { char: 'ڈ', label: 'ڈ', desc: 'Retroflex d' },
    { char: 'ں', label: 'ں', desc: 'Nasal nun ghunna' },
    { char: 'ے', label: 'ے', desc: 'Bari ye' },
    { char: 'ہ', label: 'ہ', desc: 'Choti heh' },
    { char: 'ھ', label: 'ھ', desc: 'Do-chashmi heh (aspiration)' },
    { char: 'ء', label: 'ء', desc: 'Hamza' },
    { char: 'ئ', label: 'ئ', desc: 'Yeh with hamza' },
    { char: 'ؤ', label: 'ؤ', desc: 'Waw with hamza' },
    { char: 'آ', label: 'آ', desc: 'Alef Madda' },
    { char: '،', label: '،', desc: 'Arabic comma' },
    { char: '؟', label: '؟', desc: 'Arabic question mark' },
    { char: '؛', label: '؛', desc: 'Arabic semicolon' },
  ];

  // 2. Brahui Roman (Brolikwar) Character Set
  const brahuiRomanChars: KeyChar[] = [
    { char: 'á', label: 'á', desc: 'Long a (ā)' },
    { char: 'í', label: 'í', desc: 'Long i (ī)' },
    { char: 'ú', label: 'ú', desc: 'Long u (ū)' },
    { char: 'ē', label: 'ē', desc: 'Long e' },
    { char: 'ō', label: 'ō', desc: 'Long o' },
    { char: 'lh', label: 'lh', desc: 'Lateral fricative (ݪ)', special: true },
    { char: 'ŕ', label: 'ŕ', desc: 'Retroflex r (ڑ)' },
    { char: 'đ', label: 'đ', desc: 'Retroflex d (ڈ)' },
    { char: 'ţ', label: 'ţ', desc: 'Retroflex t (ٹ)' },
    { char: 'ń', label: 'ń', desc: 'Nasal n (ں)' },
    { char: '’', label: '’', desc: 'Hamza apostrophe' },
    { char: 'č', label: 'č', desc: 'Ch' },
    { char: 'š', label: 'š', desc: 'Sh' },
  ];

  // 3. Urdu Specific Character Set
  const urduChars: KeyChar[] = [
    { char: 'ٹ', label: 'ٹ', desc: 'Retroflex t' },
    { char: 'ڈ', label: 'ڈ', desc: 'Retroflex d' },
    { char: 'ڑ', label: 'ڑ', desc: 'Retroflex r' },
    { char: 'ں', label: 'ں', desc: 'Nun ghunna' },
    { char: 'ے', label: 'ے', desc: 'Bari ye' },
    { char: 'ھ', label: 'ھ', desc: 'Do-chashmi he' },
    { char: 'ہ', label: 'ہ', desc: 'Gol he' },
    { char: 'ء', label: 'ء', desc: 'Hamza' },
    { char: 'ئ', label: 'ئ', desc: 'Hamza on ye' },
    { char: 'ؤ', label: 'ؤ', desc: 'Waw with hamza' },
    { char: 'آ', label: 'آ', desc: 'Alef Madda' },
    { char: 'ۂ', label: 'ۂ', desc: 'He with hamza' },
    { char: '،', label: '،', desc: 'Urdu comma' },
    { char: '؟', label: '؟', desc: 'Urdu question mark' },
    { char: '۔', label: '۔', desc: 'Urdu full stop (khatma)' },
  ];

  // 4. English Accents / Quick Phonetics
  const englishChars: KeyChar[] = [
    { char: 'ā', label: 'ā', desc: 'Macron a' },
    { char: 'ī', label: 'ī', desc: 'Macron i' },
    { char: 'ū', label: 'ū', desc: 'Macron u' },
    { char: 'ṭ', label: 'ṭ', desc: 'Retroflex t' },
    { char: 'ḍ', label: 'ḍ', desc: 'Retroflex d' },
    { char: 'ṛ', label: 'ṛ', desc: 'Retroflex r' },
    { char: 'ñ', label: 'ñ', desc: 'Nasal n' },
    { char: '“', label: '“', desc: 'Left quote' },
    { char: '”', label: '”', desc: 'Right quote' },
    { char: '—', label: '—', desc: 'Em dash' },
  ];

  const getLayoutDetails = () => {
    switch (activeLayout) {
      case 'brahui-arabic':
        return {
          title: 'Brahui Perso-Arabic (براہوئی تختہ تختی)',
          chars: brahuiArabicChars,
          badge: 'براہوئی حروف (ݪ, ڑ, ٹ, ڈ)',
          dir: 'rtl' as const,
        };
      case 'brahui-latin':
      case 'brahui-roman':
        return {
          title: 'Brahui Roman / Brolikwar Keyboard',
          chars: brahuiRomanChars,
          badge: 'Brolikwar Diacritics (lh, á, í, ú, ŕ, đ)',
          dir: 'ltr' as const,
        };
      case 'urdu':
        return {
          title: 'Urdu Keyboard (اردو تختہ تختی)',
          chars: urduChars,
          badge: 'اردو حروف مخصوصہ',
          dir: 'rtl' as const,
        };
      case 'english':
      default:
        return {
          title: 'English Phonetic & Accent Input',
          chars: englishChars,
          badge: 'English / Roman Phonetics',
          dir: 'ltr' as const,
        };
    }
  };

  const layoutDetails = getLayoutDetails();

  return (
    <div
      id="dynamic-input-keyboard"
      className="p-2 sm:p-2.5 bg-slate-50/90 border border-slate-200/90 rounded-xl text-xs space-y-1.5 transition-all"
    >
      {/* Header with Automatic Detection Indicator & Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          <Keyboard className="w-3.5 h-3.5 text-blue-600" />
          <span>Dynamic Input Keyboard:</span>
          <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
            {layoutDetails.title}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Auto-detected
          </span>
        </div>

        {/* Quick layout selector if user wants to switch input keyboard */}
        {onLayoutChange && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Switch:</span>
            <button
              type="button"
              onClick={() => onLayoutChange('brahui-arabic')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                activeLayout === 'brahui-arabic'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
              }`}
            >
              براہوئی
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange('brahui-roman')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                activeLayout === 'brahui-latin' || activeLayout === 'brahui-roman'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
              }`}
            >
              Roman
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange('urdu')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                activeLayout === 'urdu'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
              }`}
            >
              اردو
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange('english')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                activeLayout === 'english'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
              }`}
            >
              Eng
            </button>
          </div>
        )}
      </div>

      {/* Keyboard Buttons Grid */}
      <div
        dir={layoutDetails.dir}
        className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-1 overflow-x-auto no-scrollbar"
      >
        {layoutDetails.chars.map((item) => (
          <button
            key={item.char}
            type="button"
            onClick={() => onInsertChar(item.char)}
            title={`${item.desc} (Click to insert)`}
            className={`min-w-[34px] sm:min-w-[38px] h-8 sm:h-9 px-2 flex items-center justify-center rounded-lg border text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs ${
              item.special
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 font-bold ring-1 ring-amber-400'
                : 'bg-white hover:bg-blue-50 hover:border-blue-400 text-slate-800 border-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}

        {/* Quick space bar */}
        <button
          type="button"
          onClick={() => onInsertChar(' ')}
          title="Insert Space"
          className="h-8 sm:h-9 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium cursor-pointer shadow-2xs"
        >
          Space
        </button>
      </div>

      {activeLayout === 'english' && (
        <div className="text-[10px] text-slate-500 pt-0.5">
          Tip: Selecting <strong>Brahui (براہوئی)</strong> or <strong>Urdu (اردو)</strong> in the tabs above automatically switches this keyboard to specialized Perso-Arabic letters (including the rare Brahui <span className="font-bold text-amber-800">ݪ</span>).
        </div>
      )}
    </div>
  );
};
