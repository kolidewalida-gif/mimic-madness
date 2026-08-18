"use client";

import * as React from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Plus, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Member {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  /** Optional status dot color (e.g. online/offline) */
  statusColor?: string;
  /** Highlight this row (e.g. "you") */
  highlight?: boolean;
}

export interface MemberSelectorProps {
  members: Member[];
  selected: string[];
  onChange: (selected: string[]) => void;
  max?: number;
  maxVisible?: number;
  label?: string;
  className?: string;
  /** Layout: row of avatars (horizontal) or stacked rows (vertical) */
  orientation?: "horizontal" | "vertical";
  /** When false, rows are display-only (no toggle) — useful for a lobby roster */
  selectable?: boolean;
  /** Label for the add button */
  addLabel?: string;
  /** If provided, the add button calls this instead of opening the internal dropdown */
  onAddClick?: () => void;
  /** Right-aligned action node per member (vertical only) */
  renderItemAction?: (member: Member) => React.ReactNode;
  /** Inline badge after the name (e.g. host crown) */
  getBadge?: (member: Member) => React.ReactNode;
  /** Secondary line under the name (vertical only) */
  renderItemMeta?: (member: Member) => React.ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ───────────────────────── Horizontal avatar (original) ───────────────────────── */
function Avatar({ member, isSelected, onClick }: { member: Member; isSelected: boolean; onClick: () => void }) {
  return (
    <motion.button
      layoutId={`member-${member.id}`}
      onClick={onClick}
      className="group relative flex flex-col items-center gap-1.5 outline-none cursor-pointer"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div
        className={cn(
          "relative w-12 h-12 rounded-full overflow-hidden transition-all duration-200",
          !isSelected && "opacity-50 hover:opacity-75",
        )}
      >
        {member.avatar ? (
          <img src={member.avatar} alt={member.name} className={cn("w-full h-full object-cover", !isSelected && "grayscale")} />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center text-sm font-medium", isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            {getInitials(member.name)}
          </div>
        )}
      </div>
      <AnimatePresence>
        {!isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute bottom-5 right-0 w-4 h-4 rounded-full bg-foreground dark:bg-white flex items-center justify-center shadow-sm"
          >
            <Plus className="w-2.5 h-2.5 text-background dark:text-black" strokeWidth={2.5} />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.span
        layoutId={`member-name-${member.id}`}
        className={cn("text-xs font-medium truncate max-w-[60px] transition-colors duration-200", isSelected ? "text-foreground" : "text-muted-foreground")}
      >
        {member.name.split(" ")[0]}
      </motion.span>
    </motion.button>
  );
}

/* ───────────────────────── Vertical row ───────────────────────── */
function MemberRow({
  member,
  selectable,
  selected,
  onClick,
  badge,
  meta,
  action,
}: {
  member: Member;
  selectable: boolean;
  selected: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "group relative flex items-center gap-3 px-2.5 py-2 rounded-2xl transition-colors",
        member.highlight ? "bg-primary/10" : "hover:bg-white/[0.04]",
      )}
    >
      <button
        type="button"
        onClick={selectable ? onClick : undefined}
        className={cn("flex items-center gap-3 flex-1 min-w-0 text-left outline-none", selectable && "cursor-pointer")}
      >
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-black text-white border-2 border-white/15 bg-gradient-to-br from-[var(--ink-accent)] to-[var(--ink-accent-strong)]">
            {member.avatar ? (
              <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
            ) : (
              getInitials(member.name)
            )}
          </div>
          {member.statusColor && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a0d2e]"
              style={{ background: member.statusColor, boxShadow: `0 0 6px ${member.statusColor}` }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-white truncate" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {member.name}
            </span>
            {badge}
          </div>
          {meta && <div className="text-[10px] mt-0.5">{meta}</div>}
        </div>
      </button>
      {action && <div className="flex-shrink-0">{action}</div>}
    </motion.div>
  );
}

/* ───────────────────────── Dropdown (horizontal add) ───────────────────────── */
function Dropdown({
  members,
  selected,
  onSelect,
  searchQuery,
  onSearchChange,
}: {
  members: Member[];
  selected: string[];
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    return members
      .filter((m) => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
      .sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)));
  }, [members, selected, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute top-full right-0 mt-2 w-72 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50"
    >
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-transparent rounded-lg outline-none focus:border-primary/50 focus:bg-background placeholder:text-muted-foreground transition-colors"
          />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.map((member) => {
          const isSelected = selected.includes(member.id);
          return (
            <button
              key={member.id}
              onClick={() => onSelect(member.id)}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors", isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50")}
            >
              <div className={cn("w-9 h-9 rounded-full overflow-hidden flex-shrink-0", !isSelected && "grayscale opacity-60")}>
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-medium bg-muted text-muted-foreground">{getInitials(member.name)}</div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium truncate text-foreground/90">{member.name}</div>
                {member.email && <div className="text-xs text-muted-foreground truncate">{member.email}</div>}
              </div>
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", isSelected ? "bg-primary" : "border-2 border-muted-foreground/30")}>
                {isSelected && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <div className="px-3 py-8 text-center text-sm text-muted-foreground">No members found</div>}
      </div>
    </motion.div>
  );
}

/* ───────────────────────── Add button ───────────────────────── */
function AddButton({ onClick, isOpen, label, vertical }: { onClick: () => void; isOpen: boolean; label: string; vertical: boolean }) {
  if (vertical) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-2xl border-2 border-dashed border-amber-400/50 hover:border-amber-400 hover:bg-amber-400/10 transition-all outline-none cursor-pointer"
      >
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-amber-400/60 flex items-center justify-center flex-shrink-0">
          <Plus className="w-5 h-5 text-amber-400" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-black text-amber-300" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {label}
        </span>
      </motion.button>
    );
  }
  return (
    <motion.button onClick={onClick} className="group flex flex-col items-center gap-1.5 outline-none cursor-pointer" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <div className={cn("w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200", isOpen ? "border-primary bg-primary/10" : "border-muted-foreground/40 hover:border-muted-foreground/60 hover:bg-muted/50")}>
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus className={cn("w-5 h-5 transition-colors duration-200", isOpen ? "text-primary" : "text-muted-foreground")} />
        </motion.div>
      </div>
      <span className={cn("text-xs font-medium transition-colors duration-200", isOpen ? "text-primary" : "text-muted-foreground")}>{label}</span>
    </motion.button>
  );
}

const MemberSelector = React.forwardRef<HTMLDivElement, MemberSelectorProps>(
  (
    {
      members,
      selected,
      onChange,
      max,
      maxVisible = 5,
      label,
      className,
      orientation = "horizontal",
      selectable = true,
      addLabel = "Add",
      onAddClick,
      renderItemAction,
      getBadge,
      renderItemMeta,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);
    const isVertical = orientation === "vertical";

    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchQuery("");
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sortedMembers = React.useMemo(() => {
      if (isVertical) return members; // preserve given order for a roster
      return [...members].sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)));
    }, [members, selected, isVertical]);

    const visibleMembers = isVertical ? sortedMembers : sortedMembers.slice(0, maxVisible);

    const toggleMember = (id: string) => {
      if (!selectable) return;
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id));
      } else {
        if (max && selected.length >= max) return;
        onChange([...selected, id]);
      }
    };

    const handleAdd = () => {
      if (onAddClick) onAddClick();
      else setIsOpen((o) => !o);
    };

    return (
      <div ref={ref} className={cn("relative", className)}>
        {label && <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{label}</div>}

        {isVertical ? (
          <div ref={containerRef} className="flex flex-col gap-1.5">
            <LayoutGroup>
              <AnimatePresence initial={false}>
                {visibleMembers.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    selectable={selectable}
                    selected={selected.includes(member.id)}
                    onClick={() => toggleMember(member.id)}
                    badge={getBadge?.(member)}
                    meta={renderItemMeta?.(member)}
                    action={renderItemAction?.(member)}
                  />
                ))}
              </AnimatePresence>
            </LayoutGroup>
            <AddButton onClick={handleAdd} isOpen={isOpen} label={addLabel} vertical />
          </div>
        ) : (
          <div ref={containerRef} className="flex items-start gap-4 flex-wrap">
            <LayoutGroup>
              {visibleMembers.map((member) => (
                <Avatar key={member.id} member={member} isSelected={selected.includes(member.id)} onClick={() => toggleMember(member.id)} />
              ))}
              <div className="relative">
                <AddButton onClick={handleAdd} isOpen={isOpen} label={addLabel} vertical={false} />
                <AnimatePresence>
                  {isOpen && !onAddClick && (
                    <Dropdown members={members} selected={selected} onSelect={toggleMember} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                  )}
                </AnimatePresence>
              </div>
            </LayoutGroup>
          </div>
        )}
      </div>
    );
  },
);
MemberSelector.displayName = "MemberSelector";

export { MemberSelector };
