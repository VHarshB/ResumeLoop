'use client';

import { useState } from 'react';

interface JobFields {
  company: string;
  title: string;
  location: string;
  pay: string;
  link: string;
}

interface RunResult {
  runId: string;
  fields: JobFields;
  downloadUrl: string | null;
  status: 'ok' | 'error';
  error?: string;
  logs?: {
    compile?: string;
  };
}

interface HistoryItem extends RunResult {
  timestamp: Date;
}

export default function Home() {
  const [jd, setJd] = useState('');
  const [jobLink, setJobLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jd.trim()) {
      alert('Please enter a job description');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jd: jd.trim(),
          jobLink: jobLink.trim() || undefined,
        }),
      });

      const data: RunResult = await response.json();

      setResult(data);

      if (data.status === 'ok') {
        // Add to history
        setHistory(prev => [
          {
            ...data,
            timestamp: new Date(),
          },
          ...prev.slice(0, 9), // Keep last 10
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      setResult({
        runId: '',
        fields: { company: '', title: '', location: '', pay: '', link: '' },
        downloadUrl: null,
        status: 'error',
        error: 'Network error. Please check if the server is running.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setJd('');
    setJobLink('');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            JobLoop
          </h1>
          <p className="text-gray-600">
            Automated Job Application Resume Generator (Local AI)
          </p>
        </div>

        {/* Main Input Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="jd" className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                id="jd"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="jobLink" className="block text-sm font-medium text-gray-700 mb-2">
                Job Link (optional)
              </label>
              <input
                id="jobLink"
                type="url"
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
                placeholder="https://example.com/job-posting"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !jd.trim()}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Generating Resume...' : 'Generate Resume'}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">
                Processing... This may take 20-60 seconds depending on your hardware.
              </span>
            </div>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className={`rounded-lg p-6 mb-6 ${
            result.status === 'ok' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {result.status === 'ok' ? (
              <>
                <h2 className="text-xl font-bold text-green-800 mb-4">
                  ✓ Resume Generated Successfully!
                </h2>

                <div className="bg-white rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Extracted Information:</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Company:</span> {result.fields.company}
                    </div>
                    <div>
                      <span className="font-medium">Title:</span> {result.fields.title}
                    </div>
                    <div>
                      <span className="font-medium">Location:</span> {result.fields.location}
                    </div>
                    <div>
                      <span className="font-medium">Pay:</span> {result.fields.pay}
                    </div>
                  </div>
                  {result.fields.link && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Link:</span>{' '}
                      <a 
                        href={result.fields.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {result.fields.link}
                      </a>
                    </div>
                  )}
                </div>

                {result.downloadUrl && (
                  <a
                    href={result.downloadUrl}
                    download
                    className="inline-block bg-green-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Download PDF Resume
                  </a>
                )}

                <p className="text-sm text-gray-600 mt-4">
                  Run ID: {result.runId}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-red-800 mb-2">
                  ✗ Error
                </h2>
                <p className="text-red-700 mb-4">{result.error}</p>
                {result.logs?.compile && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium text-red-800 mb-2">
                      View Compilation Logs
                    </summary>
                    <pre className="bg-white p-3 rounded overflow-x-auto text-xs">
                      {result.logs.compile}
                    </pre>
                  </details>
                )}
              </>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recent Runs
            </h2>
            <div className="space-y-3">
              {history.map((item, index) => (
                <div
                  key={item.runId}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {item.fields.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.fields.company} • {item.fields.location}
                      </p>
                    </div>
                    {item.downloadUrl && (
                      <a
                        href={item.downloadUrl}
                        download
                        className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
                      >
                        Download
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {item.timestamp.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Powered by Ollama • Local AI • No API costs</p>
        </div>
      </div>
    </div>
  );
}
