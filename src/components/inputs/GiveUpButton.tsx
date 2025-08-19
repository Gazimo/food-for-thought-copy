"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { useState } from "react";

interface GiveUpButtonProps {
  onGiveUp: () => void;
}

export const GiveUpButton: React.FC<GiveUpButtonProps> = ({ onGiveUp }) => {
  const [giveUpOpen, setGiveUpOpen] = useState(false);

  const handleGiveUp = () => {
    onGiveUp();
    setGiveUpOpen(false);
  };

  return (
    <>
      <Dialog open={giveUpOpen} onOpenChange={setGiveUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to give up?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="default" onClick={() => setGiveUpOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleGiveUp}>
              Ok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        className="p-1 sm:p-1.5 md:p-2"
        variant="danger"
        onClick={() => setGiveUpOpen(true)}
      >
        <div className="w-5 h-5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 relative">
          <Image
            src="/images/give-up.png"
            alt="Give Up"
            fill
            className="object-contain"
          />
        </div>
      </Button>
    </>
  );
};
