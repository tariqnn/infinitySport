import {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
  useId,
} from "react";
import clsx from "clsx";

export function Input({
  label,
  error,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
}) {
  const generatedId = useId();
  const id = props.id || generatedId;

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={id} className="control-label">
          {label}
          {props.required ? <span className="ml-1 text-ui-danger">*</span> : null}
        </label>
      ) : null}
      <input
        id={id}
        className={clsx(
          "control-field",
          error ? "border-ui-danger bg-red-50" : "border-ui-border bg-white text-ui-textPrimary",
          className
        )}
        {...props}
      />
      {error ? <p className="mt-1.5 text-sm text-ui-danger">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-sm text-ui-textMuted">{hint}</p> : null}
    </div>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
}) {
  const generatedId = useId();
  const id = props.id || generatedId;

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={id} className="control-label">
          {label}
          {props.required ? <span className="ml-1 text-ui-danger">*</span> : null}
        </label>
      ) : null}
      <textarea
        id={id}
        className={clsx(
          "control-field min-h-24 resize-none py-2",
          error ? "border-ui-danger bg-red-50" : "border-ui-border bg-white text-ui-textPrimary",
          className
        )}
        {...props}
      />
      {error ? <p className="mt-1.5 text-sm text-ui-danger">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-sm text-ui-textMuted">{hint}</p> : null}
    </div>
  );
}

export function Select({
  label,
  error,
  hint,
  className,
  options,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  children?: ReactNode;
}) {
  const generatedId = useId();
  const id = props.id || generatedId;

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={id} className="control-label">
          {label}
          {props.required ? <span className="ml-1 text-ui-danger">*</span> : null}
        </label>
      ) : null}
      <select
        id={id}
        className={clsx(
          "control-field",
          error ? "border-ui-danger bg-red-50" : "border-ui-border bg-white text-ui-textPrimary",
          className
        )}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
      {error ? <p className="mt-1.5 text-sm text-ui-danger">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-sm text-ui-textMuted">{hint}</p> : null}
    </div>
  );
}
