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
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="relative p-8 md:p-12">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-2">
              <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Quick Start Guide</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Follow these 3 simple steps to get your exam analysis ready in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Step 1 */}
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl mx-auto shadow-sm">1</div>
              <h3 className="text-xl font-bold text-gray-900">Download</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Get our custom Excel template pre-filled with your subjects.
              </p>
              <button 
                onClick={onDownloadTemplate}
                className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-blue-100"
              >
                <Download className="w-4 h-4" /> Template
              </button>
            </div>

            {/* Step 2 */}
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-xl mx-auto shadow-sm">2</div>
              <h3 className="text-xl font-bold text-gray-900">Fill Data</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Enter student names, gender, and scores in the Excel file.
              </p>
              <div className="py-3 px-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
                Easy Grid Format
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl mx-auto shadow-sm">3</div>
              <h3 className="text-xl font-bold text-gray-900">Upload</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Upload the completed file to instantly see your analysis.
              </p>
              <button 
                onClick={onImportExcel}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all"
              >
                <Upload className="w-4 h-4" /> Import Now
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-sm text-gray-600 font-medium">
                Need to change subjects? Visit the <strong>Configuration</strong> tab first.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              Got it, let's go!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
