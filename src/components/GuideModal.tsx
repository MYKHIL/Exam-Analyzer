import React from 'react';
import { X, Download, CheckCircle2, Upload, FileSpreadsheet, ArrowRight } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadTemplate: () => void;
  onImportExcel: () => void;
}

export default function GuideModal({ isOpen, onClose, onDownloadTemplate, onImportExcel }: GuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
        <div className="relative p-6 md:p-12">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center space-y-3 md:space-y-4 mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-indigo-100 rounded-2xl mb-2">
              <FileSpreadsheet className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900">Quick Start Guide</h2>
            <p className="text-sm md:text-lg text-gray-500 max-w-xl mx-auto px-4">
              Follow these 3 simple steps to get your exam analysis ready in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
            {/* Step 1 */}
            <div className="space-y-3 md:space-y-4 text-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-lg md:text-xl mx-auto shadow-sm">1</div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Download</h3>
              <p className="text-gray-500 text-xs md:text-sm leading-relaxed">
                Get our custom Excel template pre-filled with your subjects.
              </p>
              <button 
                onClick={onDownloadTemplate}
                className="w-full py-2.5 md:py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-blue-100"
              >
                <Download className="w-4 h-4" /> Template
              </button>
            </div>

            {/* Step 2 */}
            <div className="space-y-3 md:space-y-4 text-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-lg md:text-xl mx-auto shadow-sm">2</div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Fill Data</h3>
              <p className="text-gray-500 text-xs md:text-sm leading-relaxed">
                Enter student names, gender, and scores in the Excel file.
              </p>
              <div className="py-2.5 md:py-3 px-4 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] md:text-xs font-medium flex items-center justify-center gap-2 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
                Easy Grid Format
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-3 md:space-y-4 text-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-lg md:text-xl mx-auto shadow-sm">3</div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Upload</h3>
              <p className="text-gray-500 text-xs md:text-sm leading-relaxed">
                Upload the completed file to instantly see your analysis.
              </p>
              <button 
                onClick={onImportExcel}
                className="w-full py-2.5 md:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all"
              >
                <Upload className="w-4 h-4" /> Import Now
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
              </div>
              <p className="text-xs md:text-sm text-gray-600 font-medium">
                Need to change subjects? Visit the <strong>Configuration</strong> tab first.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="w-full md:w-auto px-6 md:px-8 py-2.5 md:py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
