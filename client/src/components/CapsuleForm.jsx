import { useEffect, useState } from 'react';

const EMPTY = {
  project_name: '',
  prompt_title: '',
  prompt_version: 'v1',
  prompt_text: '',
  response_summary: '',
  category: 'Coding',
  usefulness: 'Good',
  reviewed: false,
  improved: false,
  screenshot_url: '',
  notes: '',
};

/**
 * One form used for both CREATE and UPDATE.
 * When `editing` is a capsule the form is pre-filled and submitting sends PUT;
 * when it is null the form is blank and submitting sends POST.
 */
export default function CapsuleForm({ editing, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({
        project_name: editing.project_name || '',
        prompt_title: editing.prompt_title || '',
        prompt_version: editing.prompt_version || '',
        prompt_text: editing.prompt_text || '',
        response_summary: editing.response_summary || '',
        category: editing.category || '',
        usefulness: editing.usefulness || '',
        reviewed: Boolean(editing.reviewed),
        improved: Boolean(editing.improved),
        screenshot_url: editing.screenshot_url || '',
        notes: editing.notes || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [editing]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
    if (!editing) setForm(EMPTY);
  }

  return (
    <form className="capsule-form card" onSubmit={handleSubmit}>
      <h2>{editing ? `Edit capsule #${editing.id}` : 'New capsule'}</h2>

      <div className="grid-2">
        <label>
          Project name <span className="req">*</span>
          <input
            required
            value={form.project_name}
            onChange={(e) => update('project_name', e.target.value)}
            placeholder="SmartFarm Irrigation"
          />
        </label>

        <label>
          Prompt title <span className="req">*</span>
          <input
            required
            value={form.prompt_title}
            onChange={(e) => update('prompt_title', e.target.value)}
            placeholder="Debug cloud deployment"
          />
        </label>

        <label>
          Version
          <input
            value={form.prompt_version}
            onChange={(e) => update('prompt_version', e.target.value)}
            placeholder="v1"
          />
        </label>

        <label>
          Category
          <select value={form.category} onChange={(e) => update('category', e.target.value)}>
            <option>Coding</option>
            <option>Writing</option>
            <option>Research</option>
            <option>Study</option>
            <option>Other</option>
          </select>
        </label>
      </div>

      <label>
        Prompt text <span className="req">*</span>
        <textarea
          required
          rows={4}
          value={form.prompt_text}
          onChange={(e) => update('prompt_text', e.target.value)}
          placeholder="Why does my Node server fail to start on Render?"
        />
      </label>

      <label>
        Response summary
        <textarea
          rows={2}
          value={form.response_summary}
          onChange={(e) => update('response_summary', e.target.value)}
          placeholder="Check the start command and the PORT environment variable."
        />
      </label>

      <div className="grid-2">
        <label>
          Usefulness
          <select value={form.usefulness} onChange={(e) => update('usefulness', e.target.value)}>
            <option>Good</option>
            <option>Needs Improvement</option>
          </select>
        </label>

        <label>
          Screenshot evidence (URL)
          <input
            type="url"
            value={form.screenshot_url}
            onChange={(e) => update('screenshot_url', e.target.value)}
            placeholder="https://..."
          />
        </label>
      </div>

      <label>
        Notes
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Tested and worked."
        />
      </label>

      <div className="checkbox-row">
        <label className="inline">
          <input
            type="checkbox"
            checked={form.reviewed}
            onChange={(e) => update('reviewed', e.target.checked)}
          />
          Reviewed
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={form.improved}
            onChange={(e) => update('improved', e.target.checked)}
          />
          Improved the output
        </label>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {editing ? 'Save changes' : 'Add capsule'}
        </button>
        {editing && (
          <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
