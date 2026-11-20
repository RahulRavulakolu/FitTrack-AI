import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { useApp, api, errorMessage } from '../lib/app';
import { Button, Modal, Field } from './ui';
export function Assistant({ onClose }: { onClose: () => void }) {
  const { state: s, toast } = useApp();
  const [question, setQuestion] = useState(''),
    [messages, setMessages] = useState<{ question: string; answer: string }[]>([]),
    [busy, setBusy] = useState(false);
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/assistant', { question });
      setMessages([...messages, { question, answer: data.answer }]);
      setQuestion('');
    } catch (e) {
      toast(errorMessage(e), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="A little guidance, when you need it" onClose={onClose}>
      <div className="assistant-intro">
        <Sparkles size={29} />
        <p>
          Ask about your actual nutrition, workouts and progress. Your assistant uses your saved
          records to help you take the next step.
        </p>
      </div>
      {(!s!.services.ai || s!.settings.localAiEnabled === false) && (
        <div className="info-banner">
          <p>
            {!s!.services.ai
              ? s!.services.aiMessage || 'The AI service is unavailable. Try again shortly.'
              : 'Enable local AI in Profile → Privacy & AI to ask your assistant.'}
          </p>
        </div>
      )}
      <div className="assistant-messages">
        {messages.map((m, i) => (
          <div key={i}>
            <strong>{m.question}</strong>
            <p>{m.answer}</p>
          </div>
        ))}
      </div>
      {!messages.length && (
        <div className="suggested-questions">
          {[
            'How much protein do I have left today?',
            'What workout am I doing today?',
            'Suggest a meal within my food budget.',
          ].map((q) => (
            <button key={q} onClick={() => setQuestion(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={ask}>
        <Field
          label="Ask your fitness assistant"
          required
          maxLength={1000}
          placeholder="What would you like to know?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="modal-actions">
          <Button
            type="submit"
            busy={busy}
            disabled={!s!.services.ai || s!.settings.localAiEnabled === false}
          >
            <Send size={17} />
            Ask FitTrack
          </Button>
        </div>
      </form>
      <p className="hint">
        AI guidance can be imperfect. Nutrition and training suggestions are estimates, not medical
        advice.
      </p>
    </Modal>
  );
}
