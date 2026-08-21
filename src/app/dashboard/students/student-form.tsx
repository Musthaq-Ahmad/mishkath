"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { createStudent, updateStudent } from "./actions";
import { createClient } from "@/lib/supabase/client";
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
import { STUDENT_CATEGORIES, STUDENT_CATEGORY_LABELS } from "@/lib/validations/student";
import type { Division, Group, Student } from "@/lib/types";

export function StudentForm({
  student,
  groups,
  divisions,
}: {
  student?: Student;
  groups: Group[];
  divisions: Division[];
}) {
  const [open, setOpen] = useState(false);
  const action = student ? updateStudent.bind(null, student.id) : createStudent;
  const [state, formAction, pending] = useActionState(action, undefined);
  const submittedRef = useRef(false);
  const [selectedGroupId, setSelectedGroupId] = useState(
    student?.group_id ?? groups[0]?.id ?? "",
  );
  const [selectedDivision, setSelectedDivision] = useState(
    student?.division ?? divisions[0]?.id ?? "",
  );
  const [selectedCategory, setSelectedCategory] = useState(student?.category ?? "boy");
  const [isActive, setIsActive] = useState(student?.is_active ?? true);
  const [photoUrl, setPhotoUrl] = useState(student?.photo_url ?? "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!submittedRef.current || pending) return;
    submittedRef.current = false;
    if (!state) {
      toast.success(student ? "Student updated" : "Student created");
      setTimeout(() => setOpen(false), 0);
    } else if (state.message) {
      toast.error(state.message);
    } else if (state.errors) {
      toast.error("Please fix the highlighted fields.");
    }
  }, [pending, state, student]);

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    const path = `${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("student-photos").upload(path, file);

    if (!error) {
      const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    }
    setUploading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      {student ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit student"
              className="text-muted-foreground hover:text-primary"
            />
          }
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <Button
              variant="default"
              className="gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
            />
          }
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Add Student
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{student ? "Edit student" : "New student"}</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            submittedRef.current = true;
            formAction(formData);
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="photo_url" value={photoUrl} />

          <div className="flex items-center gap-4">
            <div className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-surface-container-low text-lg font-semibold text-primary ring-1 ring-border transition-colors duration-200 hover:border-primary/60 hover:ring-primary/30">
              {photoUrl ? (
                <Image
                  key={photoUrl}
                  src={photoUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="size-16 animate-fade-in-up object-cover"
                />
              ) : (
                (student?.name ?? "?").charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="photo" className="text-xs">
                Photo
              </Label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:transition-colors file:duration-200 hover:file:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
              />
              {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={student?.name} required />
            {state?.errors?.name && (
              <p className="text-sm text-destructive">{state.errors.name[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="group_id">Group</Label>
              <input type="hidden" name="group_id" value={selectedGroupId} />
              <Select
                value={selectedGroupId}
                onValueChange={(value) => setSelectedGroupId(value ?? "")}
              >
                <SelectTrigger id="group_id" className="w-full">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state?.errors?.group_id && (
                <p className="text-sm text-destructive">{state.errors.group_id[0]}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="division">Division</Label>
              <input type="hidden" name="division" value={selectedDivision} />
              <Select
                value={selectedDivision}
                onValueChange={(value) => setSelectedDivision(value ?? "")}
              >
                <SelectTrigger id="division" className="w-full">
                  <SelectValue placeholder="Select a division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions
                    .filter((division) => division.is_active || division.id === student?.division)
                    .map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {state?.errors?.division && (
                <p className="text-sm text-destructive">{state.errors.division[0]}</p>
              )}
              {!student && (
                <p className="text-xs text-muted-foreground">
                  Chest number is auto-assigned from division and group.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="class">Class</Label>
              <Input
                id="class"
                name="class"
                placeholder="Grade 5, Plus One..."
                defaultValue={student?.class}
                required
              />
              {state?.errors?.class && (
                <p className="text-sm text-destructive">{state.errors.class[0]}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Category</Label>
              <input type="hidden" name="category" value={selectedCategory} />
              <Select
                value={selectedCategory}
                onValueChange={(value) =>
                  setSelectedCategory((value ?? "boy") as typeof selectedCategory)
                }
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {STUDENT_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state?.errors?.category && (
                <p className="text-sm text-destructive">{state.errors.category[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="guardian_name">Guardian name</Label>
              <Input
                id="guardian_name"
                name="guardian_name"
                defaultValue={student?.guardian_name ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="admission_number">Admission number</Label>
              <Input
                id="admission_number"
                name="admission_number"
                defaultValue={student?.admission_number ?? ""}
              />
              {state?.errors?.admission_number && (
                <p className="text-sm text-destructive">
                  {state.errors.admission_number[0]}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                defaultValue={student?.date_of_birth ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone_number">Phone number</Label>
              <Input
                id="phone_number"
                name="phone_number"
                type="tel"
                defaultValue={student?.phone_number ?? ""}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-border"
            />
            Active
          </label>

          {student?.chest_number && (
            <div className="flex flex-col gap-2">
              <Label>Chest number</Label>
              <p className="rounded-lg bg-muted px-3 py-2 text-sm font-semibold tabular-nums text-muted-foreground">
                {student.chest_number}
              </p>
            </div>
          )}
          {state?.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending || uploading}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
