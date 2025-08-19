"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntroModal = ({ isOpen, onClose }: IntroModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl">How to Play</DialogTitle>
          <DialogDescription className="text-base mt-2 space-y-2">
            <p>
              🍔 <strong>Guess the dish:</strong> You&apos;ll see a blurred image of a
              food dish. With each incorrect guess, the image will become a
              little clearer.
            </p>
            <p>
              🌍 <strong>Guess the country:</strong> Once you&apos;ve guessed the
              dish, guess its country of origin.
            </p>
            <p>
              💪 <strong>Guess the protein:</strong> You have 4 tries to guess the
              protein per serving.
            </p>
          </DialogDescription>
        </DialogHeader>
        <Button onClick={onClose} variant="cta">
          Let&apos;s Go!
        </Button>
      </DialogContent>
    </Dialog>
  );
};
