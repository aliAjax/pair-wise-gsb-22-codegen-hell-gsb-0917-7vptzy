import { useState } from "react";
import type { Wine, WineInput } from "../types";

interface WineFormProps {
  existingNames: string[];
  editingWine?: Wine | null;
  onSubmit: (input: WineInput) => void;
  onCancel?: () => void;
}

const FIELDS: Array<{ key: keyof WineInput; label: string; placeholder: string; wide?: boolean }> = [
  { key: "name", label: "酒款名称（答案）", placeholder: "如：波尔多左岸混酿", wide: true },
  { key: "region", label: "产区", placeholder: "如：波尔多 · 梅多克" },
  { key: "variety", label: "葡萄品种", placeholder: "如：赤霞珠" },
  { key: "vintage", label: "年份（选填）", placeholder: "如：2018" },
  { key: "acidity", label: "酸度", placeholder: "如：中高" },
  { key: "tannin", label: "单宁", placeholder: "如：高" },
  { key: "body", label: "酒体", placeholder: "如：饱满" },
  { key: "aroma", label: "香气关键词", placeholder: "如：黑醋栗、雪松、铅笔芯", wide: true },
];

const REQUIRED: Array<keyof WineInput> = ["name", "region", "variety", "acidity", "tannin", "body", "aroma"];

export default function WineForm({ existingNames, editingWine, onSubmit, onCancel }: WineFormProps) {
  const [form, setForm] = useState<WineInput>(() => ({
    name: editingWine?.name ?? "",
    region: editingWine?.region ?? "",
    variety: editingWine?.variety ?? "",
    vintage: editingWine?.vintage ?? "",
    acidity: editingWine?.acidity ?? "",
    tannin: editingWine?.tannin ?? "",
    body: editingWine?.body ?? "",
    aroma: editingWine?.aroma ?? "",
  }));
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof WineInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: WineInput = {
      name: form.name.trim(),
      region: form.region.trim(),
      variety: form.variety.trim(),
      vintage: form.vintage.trim(),
      acidity: form.acidity.trim(),
      tannin: form.tannin.trim(),
      body: form.body.trim(),
      aroma: form.aroma.trim(),
    };
    const missing = REQUIRED.find((key) => !next[key]);
    if (missing) {
      const label = FIELDS.find((field) => field.key === missing)?.label ?? missing;
      setError(`请填写「${label}」`);
      return;
    }
    const duplicated = existingNames.some(
      (name) => name.trim().toLowerCase() === next.name.toLowerCase()
        && name !== editingWine?.name,
    );
    if (duplicated) {
      setError("已存在同名酒款，请换一个名称");
      return;
    }
    onSubmit(next);
    if (!editingWine) {
      setForm({
        name: "", region: "", variety: "", vintage: "",
        acidity: "", tannin: "", body: "", aroma: "",
      });
    }
    setError(null);
  };

  return (
    <form className="panel wine-form" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <p>题库录入</p>
          <h2>{editingWine ? "编辑酒款" : "新增酒款"}</h2>
        </div>
      </div>
      <div className="field-grid">
        {FIELDS.map((field) => (
          <label key={field.key} className={field.wide ? "field-wide" : undefined}>
            <span>
              {field.label}
              {REQUIRED.includes(field.key) ? <em className="required">*</em> : null}
            </span>
            <input
              value={form[field.key]}
              placeholder={field.placeholder}
              onChange={(event) => update(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <button type="submit" className="primary-action">
          {editingWine ? "保存修改" : "加入题库"}
        </button>
        {editingWine && onCancel ? (
          <button type="button" onClick={onCancel}>取消</button>
        ) : null}
      </div>
    </form>
  );
}
