"use client";

import { Share2 } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { FaReddit, FaTelegram, FaTwitter, FaWhatsapp } from "react-icons/fa";

interface CircularShareMenuProps {
  shareText: string;
  shareUrl?: string;
}

export const CircularShareMenu: React.FC<CircularShareMenuProps> = ({
  shareText,
  shareUrl = "https://f4t.xyz",
}) => {
  const [open, setOpen] = useState(false);

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const links = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };

  const handleClick = (platform: keyof typeof links) => {
    posthog.capture("shared_to_social", { platform });
    window.open(links[platform], "_blank");
    setOpen(false);
  };

  return (
    <div className="relative w-full h-full">
      <button
        onClick={() => handleClick("whatsapp")}
        className={`absolute w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shadow transition-all duration-300 ${
          open
            ? "top-[-46px] opacity-100 right-[6px]"
            : "top-0 right-0 opacity-0 pointer-events-none"
        }`}
        aria-label="Share to WhatsApp"
      >
        <FaWhatsapp />
      </button>

      <button
        onClick={() => handleClick("telegram")}
        className={`absolute w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center shadow transition-all duration-300 ${
          open
            ? "left-[46px] opacity-100"
            : "left-0 opacity-0 pointer-events-none"
        }`}
        aria-label="Share to Telegram"
      >
        <FaTelegram />
      </button>

      <button
        onClick={() => handleClick("reddit")}
        className={`absolute w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center shadow transition-all duration-300 ${
          open
            ? "bottom-[-42px] right-[6px] opacity-100"
            : "bottom-0 right-0 opacity-0 pointer-events-none"
        }`}
        aria-label="Share to Reddit"
      >
        <FaReddit />
      </button>

      <button
        onClick={() => handleClick("twitter")}
        className={`absolute w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shadow transition-all duration-300 ${
          open
            ? "right-[46px] opacity-100"
            : "right-0 opacity-0 pointer-events-none"
        }`}
        aria-label="Share to Twitter"
      >
        <FaTwitter />
      </button>

      <button
        onClick={() => setOpen(!open)}
        className="w-full h-full bg-neutral-700 text-white rounded-full flex items-center justify-center shadow hover:bg-neutral-800 transition"
        aria-label="Toggle share menu"
      >
        <Share2 className="w-5 h-5" />
      </button>
    </div>
  );
};
