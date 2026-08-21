"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createProgram, updateProgram } from "./actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GENDER_CATEGORIES,
  GENDER_CATEGORY_LABELS,
  PROGRAM_TYPES,
  PROGRAM_TYPE_LABELS,
} from "@/lib/validations/program";
import type { Division, Program } from "@/lib/types";
import type { ReactNode } from "react";

function toDatetimeLocalValue(isoString: string | null) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ProgramForm({
  program,
  trigger,
  divisions,
}: {
  program?: Program;
  trigger?: ReactNode;
  divisions: Division[];
}) {
  const [open, setOpen] = useState(false);
  const action = program ? updateProgram.bind(null, program.id) : createProgram;
  const [state, formAction, pending] = useActionState(action, undefined);
  const submittedRef = useRef(false);
  const [programType, setProgramType] = useState(program?.program_type ?? "individual");
  const [category, setCategory] = useState(program?.category ?? divisions[0]?.id ?? "");
  const [genderCategory, setGenderCategory] = useState(program?.gender_category ?? "mixed");

  useEffect(() => {
    if (!submittedRef.current || pending) return;
    submittedRef.current = false;
    if (!state) {
      toast.success(program ? "Program updated" : "Program created");
      setTimeout(() => setOpen(false), 0);
    } else if (state.message) {
      toast.error(state.message);
    } else if (state.errors) {
      toast.error("Please fix the highlighted fields.");
    }
  }, [pending, state, program]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant={program ? "ghost" : "default"}
            size={program ? "icon-sm" : "default"}
            className={program ? "text-muted-foreground hover:text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90"}
          />
        }
      >
        {trigger ?? (program ? "Edit" : "Add program")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{program ? "Edit program" : "New program"}</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            const rawSchedule = formData.get("scheduled_start");
            if (typeof rawSchedule === "string" && rawSchedule) {
              formData.set("scheduled_start", new Date(rawSchedule).toISOString());
            }
            submittedRef.current = true;
            formAction(formData);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={program?.name} required />
            {state?.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="program_type">Program type</Label>
              <input type="hidden" name="program_type" value={programType} />
              <Select
                value={programType}
                onValueChange={(value) =>
                  setProgramType((value ?? "individual") as typeof programType)
                }
              >
                <SelectTrigger id="program_type" className="w-full">
                  <SelectValue placeholder="Select a program type" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {PROGRAM_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state?.errors?.program_type && (
                <p className="text-sm text-destructive">{state.errors.program_type[0]}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Category</Label>
              <input type="hidden" name="category" value={category} />
              <Select value={category} onValueChange={(value) => setCategory(value ?? "")}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {divisions
                    .filter((d) => d.is_active || d.id === program?.category)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {state?.errors?.category && (
                <p className="text-sm text-destructive">{state.errors.category[0]}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="gender_category">Gender eligibility</Label>
            <input type="hidden" name="gender_category" value={genderCategory} />
            <Select
              value={genderCategory}
              onValueChange={(value) =>
                setGenderCategory((value ?? "mixed") as typeof genderCategory)
              }
            >
              <SelectTrigger id="gender_category" className="w-full">
                <SelectValue placeholder="Select gender eligibility" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {GENDER_CATEGORY_LABELS[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.gender_category && (
              <p className="text-sm text-destructive">{state.errors.gender_category[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="max_score">Max score</Label>
            <Input
              id="max_score"
              name="max_score"
              type="number"
              min={1}
              defaultValue={program?.max_score ?? 25}
              required
            />
            {state?.errors?.max_score && (
              <p className="text-sm text-destructive">{state.errors.max_score[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="scheduled_start">Scheduled start</Label>
            <Input
              id="scheduled_start"
              name="scheduled_start"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(program?.scheduled_start ?? null)}
            />
            {state?.errors?.scheduled_start && (
              <p className="text-sm text-destructive">
                {state.errors.scheduled_start[0]}
              </p>
            )}
          </div>
          {state?.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
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
