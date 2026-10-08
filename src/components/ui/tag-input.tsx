import * as React from "react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ value, onChange, placeholder, className }: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2 rounded-md border border-zinc-200 bg-white p-2 text-xs focus-within:ring-1 focus-within:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-within:ring-zinc-300", className)}>
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
        >
          {tag}
          <button
            type="button"
            className="hover:text-red-500"
            onClick={() => onChange(value.filter((t) => t !== tag))}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        className="flex-1 bg-transparent px-1 placeholder:text-zinc-500 focus:outline-none dark:placeholder:text-zinc-400"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    </div>
  );
}
