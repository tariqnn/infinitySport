"use client";

import { useEffect } from "react";
import { useToast } from "./ToastProvider";

type ActionState = {
  status?: "idle" | "success" | "error";
  message?: string;
};

export function useActionToast(state?: ActionState) {
  const { push } = useToast();

  useEffect(() => {
    if (!state || state.status === "idle" || !state.message) return;
    push({
      type: state.status === "success" ? "success" : "error",
      message: state.message
    });
  }, [state, push]);
}

