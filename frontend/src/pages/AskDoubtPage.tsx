import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  Sparkles,
  ArrowRight,
  BookOpen,
  Languages,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';
import { useToast } from '../hooks/useToast.js';
import { SyllabusTopic } from '../types/index.js';

export const AskDoubtPage: React.FC = () => {
  const { user, educationProfile } = useAuth();
  const { success, error, warning } = useToast();
  const navigate = useNavigate();

  const [questionText, setQuestionText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(educationProfile?.subjects[0] || 'Mathematics');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load syllabus topics for selected subject
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const data = await api.get('/syllabus-topics', {
          subject: selectedSubject,
          class_level: educationProfile?.class_level || 10,
          board: educationProfile?.board || 'CBSE',
        });
        setTopics(data || []);
      } catch {}
    };

    fetchTopics();
  }, [selectedSubject, educationProfile?.class_level, educationProfile?.board]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(selected.type)) {
      error('Invalid File Type', 'Please upload a JPG, PNG, WEBP image or a PDF document.');
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      error('File Too Large', 'Maximum file size is 10MB.');
      return;
    }

    setFile(selected);
    if (selected.type.startsWith('image/')) {
      const url = URL.createObjectURL(selected);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() && !file) {
      warning('Input Required', 'Please enter a typed question or upload a question image/document.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(25);

    try {
      const formData = new FormData();
      if (questionText.trim()) formData.append('question_text', questionText.trim());
      formData.append('subject', selectedSubject);
      if (selectedTopicId) formData.append('topic_id', selectedTopicId);
      if (file) formData.append('file', file);
      formData.append('language', educationProfile?.preferred_language || 'English');

      setUploadProgress(50);
      const res = await api.post('/questions', formData);
      setUploadProgress(100);

      success('Doubt Analyzed! 🎯', 'Step-by-step verified solution generated.');
      navigate(`/questions/${res.question_id}`);
    } catch (err: any) {
      error('Analysis Failed', err.message || 'Could not analyze question. Please retry.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Page Title & Profile Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <HelpCircle className="w-6 h-6 text-brand-600" />
            Ask a Doubt
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Step-by-step solution, mathematical verification, concept gaps, and targeted practice.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold px-3 py-1.5 bg-brand-50 text-brand-700 rounded-xl border border-brand-200">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Class {educationProfile?.class_level || 10} • {educationProfile?.board || 'CBSE'}</span>
          <span className="text-slate-300">|</span>
          <Languages className="w-3.5 h-3.5" />
          <span>{educationProfile?.preferred_language || 'English'}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft space-y-6">
        {/* Subject & Topic Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Subject *
            </label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              {(educationProfile?.subjects || ['Mathematics', 'Science']).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Specific Topic (Optional)
            </label>
            <select
              value={selectedTopicId}
              onChange={e => setSelectedTopicId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">Auto-Detect from Question</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.chapter ? `${t.chapter}: ` : ''}{t.topic}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Typed Question Box */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Question Text & Mathematical Expressions
            </label>
            <span className="text-[11px] text-slate-400">Supports equations (e.g. 2x + 5 = 15)</span>
          </div>
          <textarea
            rows={4}
            value={questionText}
            onChange={e => setQuestionText(e.target.value)}
            placeholder="Type your academic question here. Include any equations, values, or specific steps where you got stuck..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-sans"
          />
        </div>

        {/* File Upload & Preview */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Upload Question Image or PDF (Optional)
          </label>

          {!file ? (
            <div className="p-6 border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-2xl bg-slate-50/50 hover:bg-slate-50 text-center transition-all">
              <input
                type="file"
                id="file-upload"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-slate-800 block">
                  Click to upload or drag & drop question photo / PDF
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  JPG, PNG, WEBP, or PDF up to 10MB
                </span>
              </label>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                {filePreview ? (
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <FileCheck className="w-7 h-7" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="file-upload-replace"
                  className="px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-xl cursor-pointer transition-colors"
                >
                  Replace
                  <input
                    type="file"
                    id="file-upload-replace"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar when Submitting */}
        {isSubmitting && (
          <div className="space-y-1.5 p-4 bg-brand-50/70 rounded-2xl border border-brand-100">
            <div className="flex items-center justify-between text-xs font-bold text-brand-900">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600 animate-spin" />
                Running AI pipeline: extraction, mathematical verification, concept classification...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-brand-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm rounded-2xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Analyzing Question & Generating Solution...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Get Step-by-Step Verified Solution</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
