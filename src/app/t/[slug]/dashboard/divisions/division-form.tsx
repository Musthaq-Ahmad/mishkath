"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createDivision, updateDivision } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Division } from "@/lib/types";

export function DivisionForm({ division }: { division?: Division }) {
  const [open, setOpen] = useState(false);
  const action = division ? updateDivision.bind(null, division.id) : createDivision;
  const [state, formAction, pending] = useActionState(action, undefined);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!submittedRef.current || pending) return;
    submittedRef.current = false;
    if (!state) {
      toast.success(division ? "Division updated" : "Division created");
      setTimeout(() => setOpen(false), 0);
    } else if (state.message) {
      toast.error(state.message);
    } else if (state.errors) {
      toast.error("Please fix the highlighted fields.");
    }
  }, [pending, state, division]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {division ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg text-outline hover:bg-surface-container-low hover:text-primary"
            />
          }
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          <span className="sr-only">Edit division</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <Button className="gap-2 rounded-xl bg-primary px-6 py-5 text-primary-foreground shadow-md hover:bg-primary/90" />
          }
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Division
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{division ? "Edit division" : "New division"}</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            submittedRef.current = true;
            formAction(formData);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={division?.name} required />
            {state?.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name_ml">Name (Malayalam)</Label>
            <Input id="name_ml" name="name_ml" defaultValue={division?.name_ml ?? ""} />
            <p className="text-xs text-muted-foreground">
              Optional — falls back to the English name if left blank.
            </p>
            {state?.errors?.name_ml && (
              <p className="text-sm text-destructive">{state.errors.name_ml[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="base_chest_number">Base chest number</Label>
            <Input
              id="base_chest_number"
              name="base_chest_number"
              type="number"
              min={1}
              defaultValue={division?.base_chest_number ?? 100}
              required
            />
            <p className="text-xs text-muted-foreground">
              Chest numbers for this division are assigned starting from this number.
            </p>
            {state?.errors?.base_chest_number && (
              <p className="text-sm text-destructive">{state.errors.base_chest_number[0]}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              defaultChecked={division?.is_active ?? true}
              className="size-4 rounded border-border"
            />
            <Label htmlFor="is_active">Active (selectable for new students/programs)</Label>
          </div>
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
