"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createGroup, updateGroup } from "./actions";
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
import type { Group } from "@/lib/types";

export function GroupForm({
  group,
  variant = "button",
}: {
  group?: Group;
  variant?: "button" | "card";
}) {
  const [open, setOpen] = useState(false);
  const action = group ? updateGroup.bind(null, group.id) : createGroup;
  const [state, formAction, pending] = useActionState(action, undefined);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current && !pending && !state) {
      setOpen(false);
      submittedRef.current = false;
    }
  }, [pending, state]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      {group ? (
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
          <span className="sr-only">Edit group</span>
        </DialogTrigger>
      ) : variant === "card" ? (
        <DialogTrigger
          render={
            <button
              type="button"
              className="group flex h-full min-h-56 w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border text-outline transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
            />
          }
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-surface-container-low transition-colors group-hover:bg-primary/10">
            <span className="material-symbols-outlined text-4xl">add_circle</span>
          </span>
          <span className="font-heading text-lg font-semibold">Create New Group</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <Button className="gap-2 rounded-xl bg-primary px-6 py-5 text-primary-foreground shadow-md hover:bg-primary/90" />
          }
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create New Group
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{group ? "Edit group" : "New group"}</DialogTitle>
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
            <Input id="name" name="name" defaultValue={group?.name} required />
            {state?.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
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
