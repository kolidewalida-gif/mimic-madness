import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";

const { fontFamily: bangers } = loadBangers("normal", { weights: ["400"] });
const { fontFamily: fredoka } = loadFredoka("normal", { weights: ["600", "700"] });
const { fontFamily: caveat } = loadCaveat("normal", { weights: ["700"] });

const BG = "#0a0a0a";
const BG_DEEP = "#050505";
const INK = "#f5f5f5";
const RED = "#ee3434";
const RED_DEEP = "#c01818";
const CREAM = "#f4ead5";
const OUTLINE = "#0a0a0a";

// Comic-style thick black outline (text-shadow stack)
const comicOutline = (size: number, color = OUTLINE) =>
  [
    `${size}px 0 0 ${color}`,
    `-${size}px 0 0 ${color}`,
    `0 ${size}px 0 ${color}`,
    `0 -${size}px 0 ${color}`,
    `${size}px ${size}px 0 ${color}`,
    `-${size}px ${size}px 0 ${color}`,
    `${size}px -${size}px 0 ${color}`,
    `-${size}px -${size}px 0 ${color}`,
  ].join(", ");

// Halftone dot pattern (comic newsprint)
const halftone = (color = RED, size = 14, opacity = 0.18) =>
  `radial-gradient(circle, ${color} 22%, transparent 23%) 0 0 / ${size}px ${size}px`;

