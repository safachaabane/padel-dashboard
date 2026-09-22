import { Check } from 'lucide-react';

interface StepDef {
  id: number;
  label: string;
}

interface Props {
  steps: StepDef[];
  current: number;
}

export default function Stepper({ steps, current }: Props) {
  return (
    <div className="stepper">
      {steps.map((s, idx) => {
        const status = current === s.id ? 'active' : current > s.id ? 'done' : '';
        return (
          <div key={s.id} className={`stepper-item${status ? ' ' + status : ''}`}>
            <div className="stepper-circle">
              {current > s.id ? <Check size={14} /> : s.id}
            </div>
            <span className="stepper-label">{s.label}</span>
            {idx < steps.length - 1 && <div className="stepper-line" />}
          </div>
        );
      })}
    </div>
  );
}
