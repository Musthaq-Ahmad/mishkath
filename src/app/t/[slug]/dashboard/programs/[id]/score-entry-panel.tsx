import { ScoreEntryRow } from "./score-entry-row";
import type { GroupScoreRow, ScoreRow } from "@/lib/types";

type StudentParticipant = {
  id: string;
  code: string | null;
  name: string;
  party: string;
};

type GroupParticipant = {
  id: string;
  groupId: string;
  code: string | null;
  name: string;
};

export function ScoreEntryPanel(
  props:
    | {
        kind: "student";
        programId: string;
        maxScore: number;
        participants: StudentParticipant[];
        scoresByParticipant: Record<string, ScoreRow>;
      }
    | {
        kind: "group";
        programId: string;
        maxScore: number;
        participants: GroupParticipant[];
        scoresByParticipant: Record<string, GroupScoreRow>;
      },
) {
  const { programId, maxScore, participants, scoresByParticipant } = props;

  if (!participants.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No participants added to this program yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {props.kind === "student"
        ? props.participants.map((participant) => (
            <ScoreEntryRow
              key={participant.id}
              kind="student"
              programId={programId}
              studentId={participant.id}
              code={participant.code}
              name={participant.name}
              party={participant.party}
              maxScore={maxScore}
              existingScore={scoresByParticipant[participant.id] as ScoreRow | undefined}
            />
          ))
        : props.participants.map((participant) => (
            <ScoreEntryRow
              key={participant.id}
              kind="group"
              programId={programId}
              groupId={participant.groupId}
              participantId={participant.id}
              code={participant.code}
              name={participant.name}
              maxScore={maxScore}
              existingScore={scoresByParticipant[participant.id] as GroupScoreRow | undefined}
            />
          ))}
    </div>
  );
}
