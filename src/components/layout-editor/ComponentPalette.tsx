import { useState, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Flame, Check, Star, Gift, Trophy } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import type { ComponentEntry, SlotDefinition } from "../../hooks/useEditorData";

// Sub-component variant schema with inline preview renderers
interface SubVariant {
  value: string;
  label: string;
  description: string;
  preview: () => React.ReactNode;
}

interface SubComponentDef {
  label: string;
  propKey: string;
  variants: SubVariant[];
}

type ComponentSubSchema = Record<string, Record<string, SubComponentDef>>;

// Badge preview renderers (inline — no iframe needed)
const BadgePreviews = {
  square: () => (
    <div className="flex items-center justify-center py-4">
      <div className="text-sm font-bold rounded-2xl w-14 h-14 flex items-center justify-center bg-[#1e3a5f] text-white">$20</div>
    </div>
  ),
  pill: () => (
    <div className="flex items-center justify-center py-4">
      <div className="text-xs font-bold rounded-full px-3.5 py-2 bg-blue-100 text-blue-800">$20</div>
    </div>
  ),
  circle: () => (
    <div className="flex items-center justify-center py-4">
      <div className="text-sm font-bold rounded-full w-12 h-12 flex items-center justify-center border-2 border-blue-600 text-blue-600">$20</div>
    </div>
  ),
};

const CardPreviews = {
  row: () => (
    <div className="flex items-center gap-2 p-2">
      <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]" />
      <div className="flex-1"><div className="h-2 bg-gray-300 rounded w-full mb-1" /><div className="h-1.5 bg-gray-200 rounded w-2/3" /></div>
      <div className="w-3 h-3 text-gray-300">&rsaquo;</div>
    </div>
  ),
  compact: () => (
    <div className="flex items-center gap-1.5 p-2">
      <div className="w-6 h-6 rounded bg-[#1e3a5f]" />
      <div className="h-2 bg-gray-300 rounded flex-1" />
    </div>
  ),
  stacked: () => (
    <div className="p-2 border border-gray-200 rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] mb-1.5" />
      <div className="h-2 bg-gray-300 rounded w-full mb-1" /><div className="h-1.5 bg-gray-200 rounded w-2/3" />
    </div>
  ),
};

const HeaderPreviews = {
  default: () => (
    <div className="flex items-center justify-between p-2">
      <div className="h-2.5 bg-gray-800 rounded w-20" />
      <div className="h-5 bg-gray-100 border border-gray-200 rounded-full w-16" />
    </div>
  ),
  minimal: () => (
    <div className="p-2">
      <div className="h-3 bg-gray-800 rounded w-24" />
    </div>
  ),
  withCount: () => (
    <div className="flex items-center justify-between p-2">
      <div><div className="h-2.5 bg-gray-800 rounded w-20 mb-1" /><div className="h-1.5 bg-gray-300 rounded w-14" /></div>
      <div className="h-5 bg-gray-100 border border-gray-200 rounded-full w-12" />
    </div>
  ),
};

const SUB_COMPONENTS: ComponentSubSchema = {
  actions_list_variant_a: {
    badge: {
      label: "Reward Badge",
      propKey: "badgeStyle",
      variants: [
        { value: "square", label: "Square Badge", description: "Solid rounded square with white text", preview: BadgePreviews.square },
        { value: "pill", label: "Pill Badge", description: "Compact pill shape with accent color", preview: BadgePreviews.pill },
        { value: "circle", label: "Circle Badge", description: "Outlined circle with colored text", preview: BadgePreviews.circle },
      ],
    },
    card: {
      label: "Card Layout",
      propKey: "cardStyle",
      variants: [
        { value: "row", label: "Row Layout", description: "Badge + text + arrow in a row", preview: CardPreviews.row },
        { value: "compact", label: "Compact", description: "Single-line tight layout", preview: CardPreviews.compact },
        { value: "stacked", label: "Stacked Card", description: "Badge on top, text below", preview: CardPreviews.stacked },
      ],
    },
    header: {
      label: "Header",
      propKey: "headerStyle",
      variants: [
        { value: "default", label: "With Filter", description: "Title + filter button", preview: HeaderPreviews.default },
        { value: "minimal", label: "Minimal", description: "Just the title", preview: HeaderPreviews.minimal },
        { value: "withCount", label: "With Count", description: "Title + count + filter", preview: HeaderPreviews.withCount },
      ],
    },
  },
  dial_variant_a: {
    gauge: {
      label: "Gauge",
      propKey: "gaugeStyle",
      variants: [
        { value: "arc", label: "Arc Gauge", description: "Semi-circular gauge with ticks", preview: () => (
          <div className="flex justify-center py-3"><svg width="60" height="40" viewBox="0 0 60 40"><path d="M 8 35 A 22 22 0 1 1 52 35" fill="none" stroke="#e5e7eb" strokeWidth="5" strokeLinecap="round" /><path d="M 8 35 A 22 22 0 0 1 30 13" fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" /><text x="30" y="30" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#111">$75</text></svg></div>
        )},
        { value: "bar", label: "Progress Bar", description: "Horizontal bar with text", preview: () => (
          <div className="px-4 py-3"><div className="text-center text-lg font-bold text-gray-900 mb-1">$75</div><div className="w-full bg-gray-200 rounded-full h-2"><div className="h-full rounded-full bg-green-600" style={{ width: "50%" }} /></div></div>
        )},
        { value: "ring", label: "Ring", description: "Circular ring progress", preview: () => (
          <div className="flex justify-center py-3"><svg width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="18" fill="none" stroke="#e5e7eb" strokeWidth="4" /><circle cx="25" cy="25" r="18" fill="none" stroke="#16a34a" strokeWidth="4" strokeDasharray="113" strokeDashoffset="56" strokeLinecap="round" transform="rotate(-90 25 25)" /><text x="25" y="28" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#111">$75</text></svg></div>
        )},
      ],
    },
    stats: {
      label: "Stats",
      propKey: "statsStyle",
      variants: [
        { value: "sideBySide", label: "Side by Side", description: "Earned left, max right", preview: () => (
          <div className="flex justify-between px-4 py-3"><div className="text-center"><div className="text-sm font-bold text-green-700">$75</div><div className="text-[8px] text-gray-400">EARNED</div></div><div className="text-center"><div className="text-sm font-bold text-gray-900">$150</div><div className="text-[8px] text-gray-400">MAX</div></div></div>
        )},
        { value: "inline", label: "Inline", description: "Single line with separator", preview: () => (
          <div className="flex items-center justify-center gap-2 py-3 text-xs"><span><b className="text-green-700">$75</b> earned</span><span className="text-gray-300">|</span><span><b>$150</b> max</span></div>
        )},
        { value: "progress", label: "Progress Bar", description: "Mini progress bar with labels", preview: () => (
          <div className="px-4 py-2 space-y-1"><div className="flex justify-between text-[10px] text-gray-500"><span className="text-green-700">$75</span><span>$150</span></div><div className="w-full bg-gray-100 rounded-full h-1.5"><div className="h-full rounded-full bg-green-600" style={{ width: "50%" }} /></div></div>
        )},
      ],
    },
    title: {
      label: "Title",
      propKey: "titleStyle",
      variants: [
        { value: "default", label: "Sans Serif", description: "Clean modern title + subtitle", preview: () => (
          <div className="p-3"><div className="font-sans font-bold text-sm text-gray-900">My rewards</div><div className="text-[10px] text-gray-400 mt-0.5">Check out your actions below to start earning.</div></div>
        )},
        { value: "serif", label: "Serif Elegant", description: "Classic serif font with italic subtitle", preview: () => (
          <div className="p-3"><div className="font-serif font-bold text-base text-gray-900">My rewards</div><div className="text-[10px] text-gray-400 mt-0.5 font-serif italic">Check out your actions below.</div></div>
        )},
        { value: "bold", label: "Bold Uppercase", description: "All-caps bold heading", preview: () => (
          <div className="p-3"><div className="font-black text-sm text-gray-900 uppercase tracking-wider">MY REWARDS</div><div className="text-[9px] text-gray-500 mt-0.5 tracking-wide">YOUR EARNING PROGRESS</div></div>
        )},
      ],
    },
    numberFont: {
      label: "Number",
      propKey: "numberFont",
      variants: [
        { value: "bold", label: "Bold Sans", description: "Standard bold font", preview: () => <div className="flex justify-center py-3"><span className="text-2xl font-bold font-sans text-gray-900">$75</span></div> },
        { value: "serif", label: "Serif Italic", description: "Classic serif numbers", preview: () => <div className="flex justify-center py-3"><span className="text-2xl font-bold font-serif italic text-gray-900">$75</span></div> },
        { value: "mono", label: "Monospace", description: "Technical monospace style", preview: () => <div className="flex justify-center py-3"><span className="text-2xl font-bold font-mono text-gray-900">$75</span></div> },
        { value: "thin", label: "Thin Light", description: "Elegant lightweight numbers", preview: () => <div className="flex justify-center py-3"><span className="text-2xl font-extralight font-sans tracking-tight text-gray-900">$75</span></div> },
      ],
    },
  },
  info_card_variant_a: {
    icon: {
      label: "Icon",
      propKey: "iconStyle",
      variants: [
        { value: "trophy", label: "Trophy", description: "Trophy icon", preview: () => <div className="flex justify-center py-3"><div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white"><Trophy className="w-4 h-4" /></div></div> },
        { value: "gift", label: "Gift", description: "Gift box icon", preview: () => <div className="flex justify-center py-3"><div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white"><Gift className="w-4 h-4" /></div></div> },
        { value: "star", label: "Star", description: "Star icon", preview: () => <div className="flex justify-center py-3"><div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white"><Star className="w-4 h-4" /></div></div> },
      ],
    },
    entries: {
      label: "Entries",
      propKey: "entriesStyle",
      variants: [
        { value: "large", label: "Large Text", description: "Big bold number", preview: () => <div className="p-3 bg-[#1e3a5f] rounded-lg"><div className="text-white font-bold text-lg">3 Entries earned</div></div> },
        { value: "badge", label: "Badge", description: "Number + badge label", preview: () => <div className="p-3 bg-[#1e3a5f] rounded-lg flex items-center gap-2"><span className="text-white font-bold text-lg">3</span><span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">entries earned</span></div> },
        { value: "circle", label: "Circle", description: "Number in a circle", preview: () => <div className="p-3 bg-[#1e3a5f] rounded-lg flex items-center gap-2"><div className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center text-white font-bold">3</div><span className="text-white/80 text-xs">entries earned</span></div> },
        { value: "minimal", label: "Minimal", description: "Small text", preview: () => <div className="p-3 bg-[#1e3a5f] rounded-lg"><div className="text-white font-bold text-sm">3 entries</div></div> },
      ],
    },
    background: {
      label: "Background",
      propKey: "bgStyle",
      variants: [
        { value: "circles", label: "Circles", description: "Decorative circles", preview: () => <div className="h-10 bg-[#1e3a5f] rounded-lg relative overflow-hidden"><div className="absolute -top-2 -right-2 w-8 h-8 rounded-full border border-white/20" /><div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-white/20" /></div> },
        { value: "dots", label: "Dots Pattern", description: "Subtle dot grid", preview: () => <div className="h-10 bg-[#1e3a5f] rounded-lg" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "8px 8px" }} /> },
        { value: "clean", label: "Clean", description: "Solid background", preview: () => <div className="h-10 bg-[#1e3a5f] rounded-lg" /> },
        { value: "diagonal", label: "Diagonal Lines", description: "Subtle diagonal pattern", preview: () => <div className="h-10 bg-[#1e3a5f] rounded-lg" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 10px)" }} /> },
      ],
    },
    titleFont: {
      label: "Title Font",
      propKey: "titleFont",
      variants: [
        { value: "sans", label: "Sans Serif", description: "Clean modern text", preview: () => <div className="p-3 bg-[#1e3a5f] rounded-lg"><div className="text-white text-sm font-medium font-sans">Your chance to win $100</div></div> },
        { value: "serif", label: "Serif", description: "Classic elegant text", preview: () => <div className="p-3 bg-[#1e3a5f] rounded-lg"><div className="text-white text-sm font-medium font-serif italic">Your chance to win $100</div></div> },
        { value: "mono", label: "Monospace", description: "Technical compact text", preview: () => <div className="p-3 bg-[#1e3a5f] rounded-lg"><div className="text-white text-xs font-medium font-mono tracking-tight">Your chance to win $100</div></div> },
        { value: "uppercase", label: "Uppercase", description: "All-caps bold text", preview: () => <div className="p-3 bg-[#1e3a5f] rounded-lg"><div className="text-white text-xs font-bold uppercase tracking-wider">Your chance to win</div></div> },
      ],
    },
    date: {
      label: "Date Display",
      propKey: "dateStyle",
      variants: [
        { value: "default", label: "Inline Text", description: "Simple text below entries", preview: () => <div className="p-3 bg-[#1e3a5f] rounded-lg"><div className="text-white/60 text-sm">Next drawing 3/15/25</div></div> },
        { value: "badge", label: "Badge", description: "Pill badge with date", preview: () => <div className="p-3 bg-[#1e3a5f] rounded-lg"><div className="inline-block text-[10px] font-medium bg-white/15 text-white px-2.5 py-1 rounded-full">Drawing: 3/15/25</div></div> },
        { value: "hidden", label: "Hidden", description: "Date not shown", preview: () => <div className="p-3 bg-[#1e3a5f] rounded-lg text-center"><span className="text-white/30 text-[10px]">Date hidden</span></div> },
      ],
    },
    layout: {
      label: "Card Layout",
      propKey: "layoutStyle",
      variants: [
        { value: "standard", label: "Standard", description: "Icon + title top, entries below", preview: () => <div className="p-2 bg-[#1e3a5f] rounded-lg text-white"><div className="text-[8px] mb-1 opacity-60">Title + icon</div><div className="text-sm font-bold">3 Entries</div><div className="text-[8px] opacity-40">Date</div></div> },
        { value: "centered", label: "Centered", description: "Everything center-aligned", preview: () => <div className="p-2 bg-[#1e3a5f] rounded-lg text-white text-center"><div className="text-[8px] mb-1 opacity-60">Title</div><div className="text-sm font-bold">3 Entries</div><div className="text-[8px] opacity-40">Date</div></div> },
        { value: "compact", label: "Compact", description: "Title left, entries right", preview: () => <div className="p-2 bg-[#1e3a5f] rounded-lg text-white flex items-center justify-between"><div><div className="text-[8px] opacity-60">Title</div><div className="text-[8px] opacity-40">Date</div></div><div className="text-sm font-bold">3</div></div> },
      ],
    },
  },
  streak_calendar_variant_a: {
    cell: {
      label: "Day Cell",
      propKey: "cellIcon",
      variants: [
        { value: "flame", label: "Flame", description: "Fire icon on completed days", preview: () => <div className="flex justify-center py-3 gap-1">{[true,true,true,false,false].map((done,i) => <div key={i} className={`w-6 h-6 rounded ${done?"bg-blue-600 text-white":"bg-gray-100 text-gray-400"} flex items-center justify-center`}>{done?<Flame className="w-3 h-3" />:<span className="text-[10px]">{i+1}</span>}</div>)}</div> },
        { value: "check", label: "Checkmark", description: "Check icon on completed", preview: () => <div className="flex justify-center py-3 gap-1">{[true,true,true,false,false].map((done,i) => <div key={i} className={`w-6 h-6 rounded ${done?"bg-blue-600 text-white":"bg-gray-100 text-gray-400"} flex items-center justify-center`}>{done?<Check className="w-3 h-3" />:<span className="text-[10px]">{i+1}</span>}</div>)}</div> },
        { value: "star", label: "Star", description: "Star icon on completed", preview: () => <div className="flex justify-center py-3 gap-1">{[true,true,true,false,false].map((done,i) => <div key={i} className={`w-6 h-6 rounded ${done?"bg-blue-600 text-white":"bg-gray-100 text-gray-400"} flex items-center justify-center`}>{done?<Star className="w-3 h-3" />:<span className="text-[10px]">{i+1}</span>}</div>)}</div> },
        { value: "dot", label: "Dot", description: "Simple dot on completed", preview: () => <div className="flex justify-center py-3 gap-1">{[true,true,true,false,false].map((done,i) => <div key={i} className={`w-6 h-6 rounded ${done?"bg-blue-600 text-white":"bg-gray-100 text-gray-400"} flex items-center justify-center`}>{done?<div className="w-2 h-2 rounded-full bg-white" />:<span className="text-[10px]">{i+1}</span>}</div>)}</div> },
      ],
    },
    badge: {
      label: "Streak Badge",
      propKey: "badgeStyle",
      variants: [
        { value: "pill", label: "Pill", description: "Rounded pill with flame", preview: () => <div className="flex justify-center py-3"><div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold"><Flame className="w-3.5 h-3.5" /> 5 days</div></div> },
        { value: "number", label: "Number", description: "Large flame + number", preview: () => <div className="flex justify-center py-3 items-center gap-1 text-blue-600"><Flame className="w-5 h-5" /><span className="text-xl font-bold">5</span></div> },
        { value: "text", label: "Text", description: "Simple text", preview: () => <div className="flex justify-center py-3"><span className="text-xs text-gray-500">5 day streak</span></div> },
      ],
    },
    cellShape: {
      label: "Cell Shape",
      propKey: "cellShape",
      variants: [
        { value: "rounded", label: "Rounded", description: "Rounded corners", preview: () => <div className="flex justify-center py-3 gap-1">{[1,2,3].map(i => <div key={i} className="w-7 h-7 rounded-md bg-blue-600" />)}</div> },
        { value: "circle", label: "Circle", description: "Fully circular", preview: () => <div className="flex justify-center py-3 gap-1">{[1,2,3].map(i => <div key={i} className="w-7 h-7 rounded-full bg-blue-600" />)}</div> },
        { value: "square", label: "Square", description: "Sharp corners", preview: () => <div className="flex justify-center py-3 gap-1">{[1,2,3].map(i => <div key={i} className="w-7 h-7 rounded-sm bg-blue-600" />)}</div> },
      ],
    },
  },
  dial_variant_b: {
    bar: { label: "Bar Style", propKey: "barStyle", variants: [
      { value: "rounded", label: "Rounded", description: "Standard rounded bar", preview: () => <div className="px-3 py-3"><div className="w-full bg-gray-200 rounded-full h-2.5"><div className="h-full rounded-full bg-green-600" style={{width:"50%"}} /></div></div> },
      { value: "thick", label: "Thick", description: "Bold chunky bar", preview: () => <div className="px-3 py-3"><div className="w-full bg-gray-200 rounded-lg h-5"><div className="h-full rounded-lg bg-green-600" style={{width:"50%"}} /></div></div> },
      { value: "segmented", label: "Segmented", description: "Individual segments", preview: () => <div className="px-3 py-3 flex gap-1">{Array.from({length:10},(_,i)=><div key={i} className="flex-1 h-3 rounded-sm" style={{backgroundColor:i<5?"#16a34a":"#e5e7eb"}} />)}</div> },
      { value: "gradient", label: "Gradient", description: "Gradient fill bar", preview: () => <div className="px-3 py-3"><div className="w-full bg-gray-200 rounded-full h-2.5"><div className="h-full rounded-full" style={{width:"50%",background:"linear-gradient(90deg, #16a34a, #16a34a88)"}} /></div></div> },
    ]},
    number: { label: "Number", propKey: "numberFont", variants: [
      { value: "bold", label: "Bold Sans", description: "Standard bold", preview: () => <div className="py-3 text-center"><span className="text-2xl font-bold font-sans text-gray-900">$75</span></div> },
      { value: "serif", label: "Serif", description: "Classic serif italic", preview: () => <div className="py-3 text-center"><span className="text-2xl font-bold font-serif italic text-gray-900">$75</span></div> },
      { value: "mono", label: "Mono", description: "Technical monospace", preview: () => <div className="py-3 text-center"><span className="text-2xl font-bold font-mono text-gray-900">$75</span></div> },
      { value: "thin", label: "Thin", description: "Elegant light", preview: () => <div className="py-3 text-center"><span className="text-3xl font-extralight font-sans text-gray-900">$75</span></div> },
    ]},
    footer: { label: "Footer", propKey: "footerStyle", variants: [
      { value: "default", label: "Default", description: "Earned + max labels", preview: () => <div className="flex justify-between px-3 py-2 text-[10px]"><span><b>$75</b> Earned</span><span>Max <b>$150</b></span></div> },
      { value: "badge", label: "Badges", description: "Pill badges", preview: () => <div className="flex justify-center gap-1 py-2"><span className="text-[9px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">$75 earned</span><span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">$150 max</span></div> },
      { value: "hidden", label: "Hidden", description: "No footer", preview: () => <div className="py-2 text-center text-[10px] text-gray-300">Hidden</div> },
    ]},
  },
  dial_variant_c: {
    display: { label: "Number Display", propKey: "displayFont", variants: [
      { value: "bold", label: "Bold Sans", description: "Big bold number", preview: () => <div className="py-3 text-center"><span className="text-3xl font-bold font-sans text-gray-900">$75</span></div> },
      { value: "serif", label: "Serif", description: "Classic serif", preview: () => <div className="py-3 text-center"><span className="text-3xl font-bold font-serif italic text-gray-900">$75</span></div> },
      { value: "mono", label: "Mono", description: "Technical style", preview: () => <div className="py-3 text-center"><span className="text-2xl font-bold font-mono text-gray-900">$75</span></div> },
      { value: "jumbo", label: "Jumbo", description: "Extra large black", preview: () => <div className="py-3 text-center"><span className="text-4xl font-black font-sans text-gray-900">$75</span></div> },
    ]},
    stats: { label: "Stats", propKey: "statsStyle", variants: [
      { value: "vertical", label: "Vertical", description: "Earned | Max columns", preview: () => <div className="flex justify-center gap-3 py-2"><div className="text-center"><div className="text-sm font-bold text-green-700">$75</div><div className="text-[8px] text-gray-400">EARNED</div></div><div className="w-px bg-gray-200" /><div className="text-center"><div className="text-sm font-bold">$150</div><div className="text-[8px] text-gray-400">MAX</div></div></div> },
      { value: "horizontal", label: "Horizontal", description: "Single row", preview: () => <div className="flex justify-between px-3 py-2 text-xs"><span><b className="text-green-700">$75</b> earned</span><span><b>$150</b> max</span></div> },
      { value: "badge", label: "Badges", description: "Pill badges", preview: () => <div className="flex justify-center gap-1 py-2"><span className="text-[9px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">$75 earned</span><span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">$150 max</span></div> },
    ]},
    subtitle: { label: "Subtitle", propKey: "subtitle", variants: [
      { value: "default", label: "Left to earn", description: "Standard text", preview: () => <div className="py-2 text-center text-xs text-gray-400">left to earn</div> },
      { value: "remaining", label: "Remaining", description: "Alternative text", preview: () => <div className="py-2 text-center text-xs text-gray-400">remaining rewards</div> },
      { value: "progress", label: "Available", description: "Progress-focused text", preview: () => <div className="py-2 text-center text-xs text-gray-400">still available</div> },
    ]},
  },
  info_card_variant_b: {
    decoration: { label: "Decoration", propKey: "decoration", variants: [
      { value: "circles", label: "Circles", description: "Floating circles", preview: () => <div className="h-10 bg-gradient-to-br from-blue-900 to-blue-600 rounded-lg relative overflow-hidden"><div className="absolute top-1 right-1 w-6 h-6 rounded-full border border-white/20" /></div> },
      { value: "lines", label: "Lines", description: "Diagonal lines", preview: () => <div className="h-10 bg-gradient-to-br from-blue-900 to-blue-600 rounded-lg" style={{backgroundImage:"repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 12px)"}} /> },
      { value: "glow", label: "Glow", description: "Radial glow effect", preview: () => <div className="h-10 bg-gradient-to-br from-blue-900 to-blue-600 rounded-lg relative overflow-hidden"><div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-blue-400/20" /></div> },
      { value: "clean", label: "Clean", description: "No decoration", preview: () => <div className="h-10 bg-gradient-to-br from-blue-900 to-blue-600 rounded-lg" /> },
    ]},
    titleFont: { label: "Title Font", propKey: "titleFont", variants: [
      { value: "bold", label: "Bold", description: "Standard bold", preview: () => <div className="p-2 bg-blue-900 rounded-lg"><div className="text-white text-sm font-bold">Win $100 each month</div></div> },
      { value: "serif", label: "Serif", description: "Elegant serif italic", preview: () => <div className="p-2 bg-blue-900 rounded-lg"><div className="text-white text-sm font-bold font-serif italic">Win $100 each month</div></div> },
      { value: "light", label: "Light", description: "Thin elegant", preview: () => <div className="p-2 bg-blue-900 rounded-lg"><div className="text-white text-base font-light tracking-wide">Win $100 each month</div></div> },
      { value: "uppercase", label: "Caps", description: "All uppercase", preview: () => <div className="p-2 bg-blue-900 rounded-lg"><div className="text-white text-xs font-bold uppercase tracking-widest">Win $100 each month</div></div> },
    ]},
    cta: { label: "Call to Action", propKey: "ctaStyle", variants: [
      { value: "text", label: "Text", description: "Simple text link", preview: () => <div className="p-2 bg-blue-900 rounded-lg"><div className="text-white/70 text-xs">Tap to learn more</div></div> },
      { value: "button", label: "Button", description: "Pill button", preview: () => <div className="p-2 bg-blue-900 rounded-lg"><div className="inline-block text-[10px] font-semibold bg-white/20 text-white px-3 py-1 rounded-full">Learn more →</div></div> },
      { value: "hidden", label: "Hidden", description: "No CTA", preview: () => <div className="p-2 bg-blue-900 rounded-lg text-center"><span className="text-white/30 text-[10px]">Hidden</span></div> },
    ]},
  },
  info_card_variant_c: {
    titleFont: { label: "Title Font", propKey: "titleFont", variants: [
      { value: "sans", label: "Sans Serif", description: "Clean modern", preview: () => <div className="p-2 border rounded-lg"><div className="text-sm font-bold text-gray-900 font-sans">Earn more by completing actions!</div></div> },
      { value: "serif", label: "Serif", description: "Classic serif", preview: () => <div className="p-2 border rounded-lg"><div className="text-base font-bold text-gray-900 font-serif">Earn more by completing actions!</div></div> },
      { value: "mono", label: "Mono", description: "Technical", preview: () => <div className="p-2 border rounded-lg"><div className="text-sm font-bold text-gray-900 font-mono">Earn more by completing actions!</div></div> },
      { value: "light", label: "Light", description: "Thin elegant", preview: () => <div className="p-2 border rounded-lg"><div className="text-base font-light text-gray-800 tracking-wide">Earn more by completing actions!</div></div> },
    ]},
    bodyFont: { label: "Body Font", propKey: "bodyFont", variants: [
      { value: "default", label: "Default", description: "Standard body text", preview: () => <div className="p-2 border rounded-lg"><div className="text-xs text-gray-600">Complete activities to earn rewards toward your goals.</div></div> },
      { value: "serif", label: "Serif", description: "Italic serif body", preview: () => <div className="p-2 border rounded-lg"><div className="text-xs text-gray-600 font-serif italic">Complete activities to earn rewards toward your goals.</div></div> },
      { value: "small", label: "Small", description: "Compact text", preview: () => <div className="p-2 border rounded-lg"><div className="text-[10px] text-gray-500">Complete activities to earn rewards toward your goals.</div></div> },
    ]},
    button: { label: "Button", propKey: "btnStyle", variants: [
      { value: "filled", label: "Filled", description: "Solid background", preview: () => <div className="py-2 flex justify-center"><div className="text-xs font-medium bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg">Learn more</div></div> },
      { value: "outline", label: "Outline", description: "Bordered button", preview: () => <div className="py-2 flex justify-center"><div className="text-xs font-medium border-2 border-blue-600 text-blue-600 px-3 py-1 rounded-lg">Learn more</div></div> },
      { value: "link", label: "Link", description: "Underlined text", preview: () => <div className="py-2 flex justify-center"><div className="text-xs font-medium text-blue-600 underline">Learn more →</div></div> },
      { value: "pill", label: "Pill", description: "Rounded pill button", preview: () => <div className="py-2 flex justify-center"><div className="text-[10px] font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-full">Learn more</div></div> },
    ]},
    borderStyle: { label: "Card Border", propKey: "borderStyle", variants: [
      { value: "default", label: "Default", description: "Thin gray border", preview: () => <div className="h-8 border border-gray-200 rounded-lg" /> },
      { value: "accent", label: "Accent Left", description: "Colored left border", preview: () => <div className="h-8 border-l-4 border-gray-200 rounded-lg" style={{borderLeftColor:"#2563eb"}} /> },
      { value: "shadow", label: "Shadow", description: "Drop shadow, no border", preview: () => <div className="h-8 rounded-lg shadow-md" /> },
      { value: "none", label: "None", description: "No border or shadow", preview: () => <div className="h-8 rounded-lg bg-gray-50" /> },
    ]},
  },
  recent_activity_variant_a: {
    dot: {
      label: "Timeline Dot",
      propKey: "dotStyle",
      variants: [
        { value: "filled", label: "Filled", description: "Solid colored dot", preview: () => <div className="flex items-center gap-2 p-3"><div className="w-4 h-4 rounded-full bg-green-600 border-2 border-white" /><div className="h-2 bg-gray-200 rounded flex-1" /></div> },
        { value: "ring", label: "Ring", description: "Outlined ring", preview: () => <div className="flex items-center gap-2 p-3"><div className="w-4 h-4 rounded-full border-2 border-green-600 bg-white" /><div className="h-2 bg-gray-200 rounded flex-1" /></div> },
        { value: "small", label: "Small", description: "Tiny dot", preview: () => <div className="flex items-center gap-2 p-3"><div className="w-2 h-2 rounded-full bg-green-600" /><div className="h-2 bg-gray-200 rounded flex-1" /></div> },
      ],
    },
    amount: {
      label: "Amount",
      propKey: "amountStyle",
      variants: [
        { value: "green", label: "Green Text", description: "Green colored amount", preview: () => <div className="flex justify-end p-3"><span className="text-xs font-semibold text-green-600">+$25.00</span></div> },
        { value: "badge", label: "Badge", description: "Pill badge amount", preview: () => <div className="flex justify-end p-3"><span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">+$25</span></div> },
        { value: "bold", label: "Bold Black", description: "Bold black text", preview: () => <div className="flex justify-end p-3"><span className="text-xs font-bold text-gray-900">+$25.00</span></div> },
      ],
    },
    summary: {
      label: "Summary",
      propKey: "summaryStyle",
      variants: [
        { value: "default", label: "Default", description: "Actions count + total", preview: () => <div className="flex justify-between p-3"><div><div className="text-[8px] text-gray-400">Actions</div><div className="text-sm font-bold">5</div></div><div className="text-lg font-bold">$50.00</div></div> },
        { value: "compact", label: "Compact", description: "Single-line summary", preview: () => <div className="flex justify-between p-3 text-xs"><span className="text-gray-400">5 actions</span><span className="font-bold">$50.00</span></div> },
        { value: "hidden", label: "Hidden", description: "No summary section", preview: () => <div className="p-3 text-center text-[10px] text-gray-300">Hidden</div> },
      ],
    },
  },
};

interface ComponentPaletteProps {
  components: ComponentEntry[];
  slotDefinitions: SlotDefinition[];
}

const SLOT_TYPE_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  dial: { bg: "bg-white", border: "border-neutral-200", badge: "bg-neutral-100 text-neutral-700" },
  info_card: { bg: "bg-white", border: "border-neutral-200", badge: "bg-neutral-100 text-neutral-700" },
  actions_list: { bg: "bg-white", border: "border-neutral-200", badge: "bg-neutral-100 text-neutral-700" },
  recent_activity: { bg: "bg-white", border: "border-neutral-200", badge: "bg-neutral-100 text-neutral-700" },
  sidebar: { bg: "bg-white", border: "border-neutral-200", badge: "bg-neutral-100 text-neutral-700" },
};


function refreshPreview() {
  const fn = (window as unknown as Record<string, unknown>).__refreshPreview;
  if (typeof fn === "function") fn();
}

function DraggableVariantCard({
  comp,
  isActive,
  tenantCode,
  onApply,
  onPreview,
}: {
  comp: ComponentEntry;
  isActive: boolean;
  tenantCode: string;
  onApply: () => void;
  onPreview: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `component-${comp.code}`,
    data: {
      type: "component",
      componentCode: comp.code,
      slotType: comp.slotType,
      defaultProps: comp.defaultProps ?? {},
    },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999 }
    : undefined;

  const colors = SLOT_TYPE_COLORS[comp.slotType] ?? { bg: "bg-gray-50", border: "border-gray-200", badge: "bg-gray-100 text-gray-700" };
  const previewUrl = `${import.meta.env.VITE_CONSUMER_URL || "http://localhost:5174"}/preview/component?code=${encodeURIComponent(comp.code)}&props=${encodeURIComponent(JSON.stringify(comp.defaultProps ?? {}))}&tenant=${encodeURIComponent(tenantCode)}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-xl overflow-hidden transition-all ${
        isDragging
          ? "opacity-60 shadow-xl ring-2 ring-neutral-400"
          : isActive
          ? "border-black ring-2 ring-neutral-300 shadow-md"
          : `${colors.border} hover:shadow-md hover:-translate-y-0.5`
      }`}
    >
      {/* Mini preview — clickable to zoom */}
      <div
        className="relative h-28 overflow-hidden cursor-pointer bg-[#f5f5f0] group"
        onClick={onPreview}
      >
        <iframe
          src={previewUrl}
          className="w-[250%] h-[250%] border-0 pointer-events-none origin-top-left"
          style={{ transform: "scale(0.4)" }}
          tabIndex={-1}
          title={`Preview: ${comp.name}`}
        />
        {/* Zoom overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-lg">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
        {/* Active badge */}
        {isActive && (
          <div className="absolute top-2 right-2 bg-black text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold shadow">
            Active
          </div>
        )}
      </div>

      {/* Info + drag handle + apply */}
      <div className={`flex items-center gap-1 p-2 ${isActive ? "bg-neutral-50" : colors.bg}`}>
        {/* Drag handle */}
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/5 shrink-0">
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="4" cy="3" r="1.5" /><circle cx="4" cy="8" r="1.5" /><circle cx="4" cy="13" r="1.5" />
            <circle cx="10" cy="3" r="1.5" /><circle cx="10" cy="8" r="1.5" /><circle cx="10" cy="13" r="1.5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium truncate ${isActive ? "text-black" : "text-gray-900"}`}>{comp.name}</div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onApply(); }}
          className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors shrink-0 ${
            isActive
              ? "bg-black text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-neutral-400 hover:text-black"
          }`}
        >
          {isActive ? "Active" : "Apply"}
        </button>
      </div>
    </div>
  );
}

export default function ComponentPalette({ components, slotDefinitions }: ComponentPaletteProps) {
  const { layoutConfig, saveSlotChange, selectedSlotKey, selectSlot, viewport, selectedTenant } = useEditor();
  const [saving, setSaving] = useState(false);
  const [previewComp, setPreviewComp] = useState<ComponentEntry | null>(null);
  const [selectedSubKey, setSelectedSubKey] = useState<string | null>(null);

  // Listen for slot and sub-component clicks from iframe
  useEffect(() => {
    function handleMsg(e: MessageEvent) {
      if (e.data?.type === "slot-clicked") {
        setSelectedSubKey(null);
      }
      if (e.data?.type === "sub-clicked") {
        selectSlot(e.data.slotKey);
        setSelectedSubKey(e.data.subKey);
      }
    }
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [selectSlot]);

  // Sync sub-key selection to iframe
  useEffect(() => {
    const iframe = document.querySelector("iframe") as HTMLIFrameElement | null;
    if (iframe?.contentWindow && selectedSlotKey) {
      iframe.contentWindow.postMessage({
        type: selectedSubKey ? "select-sub" : "select-slot",
        slotKey: selectedSlotKey,
        subKey: selectedSubKey,
      }, "*");
    }
  }, [selectedSubKey, selectedSlotKey]);

  const viewportSlots = slotDefinitions.filter((s) => s.viewports.includes(viewport));

  const selectedSlotDef = selectedSlotKey
    ? viewportSlots.find((s) => s.slotKey === selectedSlotKey)
    : null;

  // If no slot definition exists (new route with template layout), derive from the current component
  const currentSlotConfig = selectedSlotKey && layoutConfig ? layoutConfig.slots[selectedSlotKey] : null;
  const currentComp = currentSlotConfig ? components.find((c) => c.code === currentSlotConfig.componentCode) : null;
  const derivedSlotType = currentComp?.slotType;

  const allowedComponents = selectedSlotDef
    ? components.filter((c) => selectedSlotDef.allowedSlotTypes.includes(c.slotType))
    : derivedSlotType
    ? components.filter((c) => c.slotType === derivedSlotType)
    : [];

  const currentComponentCode = selectedSlotKey && layoutConfig
    ? layoutConfig.slots[selectedSlotKey]?.componentCode ?? null
    : null;

  async function handleApplyComponent(comp: ComponentEntry) {
    if (!selectedSlotKey) return;
    setSaving(true);
    await saveSlotChange(selectedSlotKey, comp.code, comp.defaultProps ?? {});
    setSaving(false);
    refreshPreview();
  }

  // No slot selected — show empty state
  if (!selectedSlotKey || (!selectedSlotDef && !derivedSlotType)) {
    return (
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col items-center justify-center p-8">
        <svg className="w-10 h-10 text-neutral-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
        </svg>
        <p className="text-sm font-medium text-neutral-500 text-center">Click on a block in the preview to see its variants</p>
        <p className="text-xs text-neutral-400 text-center mt-1.5">Or drag a variant onto any block</p>
      </div>
    );
  }

  // Sub-component selected — show ONLY sub-variant previews
  if (selectedSubKey && currentComponentCode && SUB_COMPONENTS[currentComponentCode]?.[selectedSubKey]) {
    const subDef = SUB_COMPONENTS[currentComponentCode][selectedSubKey];
    const currentSlot = layoutConfig?.slots[selectedSlotKey!];
    const currentVal = (currentSlot?.props?.[subDef.propKey] as string) ?? subDef.variants[0].value;

    return (
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{subDef.label}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Pick a variant</p>
            </div>
            <button
              onClick={() => setSelectedSubKey(null)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {saving && (
            <div className="text-center py-2 text-xs text-black font-medium animate-pulse">
              Saving & refreshing...
            </div>
          )}
          {subDef.variants.map((v) => {
            const isActive = currentVal === v.value;
            return (
              <div
                key={v.value}
                onClick={async () => {
                  if (!selectedSlotKey || !currentSlot) return;
                  setSaving(true);
                  await saveSlotChange(selectedSlotKey, currentSlot.componentCode, { ...currentSlot.props, [subDef.propKey]: v.value });
                  setSaving(false);
                  refreshPreview();
                }}
                className={`rounded-xl border overflow-hidden cursor-pointer transition-all ${
                  isActive ? "border-black ring-2 ring-black/20" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className="bg-[#f5f5f0] rounded-t-xl">
                  {v.preview()}
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <div>
                    <div className={`text-xs font-medium ${isActive ? "text-black" : "text-gray-900"}`}>{v.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{v.description}</div>
                  </div>
                  {isActive && (
                    <span className="text-[9px] bg-black text-white px-1.5 py-0.5 rounded font-medium">Active</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Block selected — show ONLY block-level variants
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{selectedSlotDef?.name ?? selectedSlotKey}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Click preview to zoom, drag to canvas</p>
          </div>
          <button
            onClick={() => { selectSlot(null); setSelectedSubKey(null); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {saving && (
          <div className="text-center py-2 text-xs text-black font-medium animate-pulse">
            Saving & refreshing...
          </div>
        )}
        {allowedComponents.map((comp) => (
          <DraggableVariantCard
            key={comp.code}
            comp={comp}
            isActive={comp.code === currentComponentCode}
            tenantCode={selectedTenant?.code ?? "kaiser"}
            onApply={() => handleApplyComponent(comp)}
            onPreview={() => setPreviewComp(comp)}
          />
        ))}
      </div>

      {/* Zoom modal */}
      {previewComp && (
        <PreviewModal
          component={previewComp}
          tenantCode={selectedTenant?.code ?? "kaiser"}
          onClose={() => setPreviewComp(null)}
          onApply={() => {
            handleApplyComponent(previewComp);
            setPreviewComp(null);
          }}
        />
      )}
    </div>
  );
}

function PreviewModal({
  component,
  tenantCode,
  onClose,
  onApply,
}: {
  component: ComponentEntry;
  tenantCode: string;
  onClose: () => void;
  onApply: () => void;
}) {
  const previewUrl = `${import.meta.env.VITE_CONSUMER_URL || "http://localhost:5174"}/preview/component?code=${encodeURIComponent(component.code)}&props=${encodeURIComponent(JSON.stringify(component.defaultProps ?? {}))}&tenant=${encodeURIComponent(tenantCode)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[640px] max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{component.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{component.description}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-gray-50 p-6">
          <div className="bg-[#f5f5f0] rounded-xl border border-gray-200 overflow-hidden" style={{ height: 350 }}>
            <iframe src={previewUrl} className="w-full h-full border-0" title={`Preview: ${component.name}`} />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-medium">{component.slotType}</span>
            <span className="text-xs text-gray-400">{component.code}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={onApply} className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-neutral-800 font-medium">
              Use this component
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
