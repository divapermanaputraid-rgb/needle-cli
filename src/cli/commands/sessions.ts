import { Command } from "commander";
import { readRecentSessions, findSessionById, SessionRecord } from "../../core/session.js";

function printSessionDetails(session: SessionRecord) {
  console.log(`id:\t\t${session.id}`);
  console.log(`createdAt:\t${session.createdAt}`);
  console.log(`mode:\t\t${session.mode}`);
  console.log(`task:\t\t${session.task}`);
  console.log(`cwd:\t\t${session.cwd}`);
  console.log(`profile:\t${session.profile || "N/A"}`);
  console.log(`providerId:\t${session.providerId || "N/A"}`);
  console.log(`status:\t\t${session.status}`);
  console.log(`durationMs:\t${session.durationMs}`);
  console.log(`summary:\t${session.summary}`);

  if (session.toolCalls && session.toolCalls.length > 0) {
    console.log(`tool calls:\t${session.toolCalls.length}`);
  } else {
    console.log(`tool calls:\t0`);
  }

  if (session.errors && session.errors.length > 0) {
    console.log(`errors:\t\t${session.errors.length}`);
  } else {
    console.log(`errors:\t\t0`);
  }

  if (session.artifacts && session.artifacts.length > 0) {
    console.log(`artifacts:\t${session.artifacts.length}`);
  } else {
    console.log(`artifacts:\t0`);
  }
}

export function sessionsCommand(): Command {
  const cmd = new Command("sessions")
    .description("Manage session history");

  cmd.command("list")
    .description("List recent sessions")
    .option("--limit <number>", "Number of sessions to show", "20")
    .action(async (options) => {
      const limit = parseInt(options.limit, 10) || 20;
      const cwd = process.cwd();
      const sessions = await readRecentSessions(cwd, limit);

      if (sessions.length === 0) {
        console.log("No sessions found.");
        return;
      }

      console.log(`id\t\t\t\t\tmode\tstatus\tprofile\tcreatedAt\t\tsummary`);
      console.log("-".repeat(80));
      for (const s of sessions) {
        const summaryShort = s.summary.length > 30 ? s.summary.substring(0, 27) + "..." : s.summary;
        console.log(`${s.id}\t${s.mode}\t${s.status}\t${s.profile || "N/A"}\t${new Date(s.createdAt).toISOString().replace("T", " ").substring(0, 19)}\t${summaryShort}`);
      }
    });

  cmd.command("last")
    .description("Show details of the most recent session")
    .action(async () => {
      const cwd = process.cwd();
      const sessions = await readRecentSessions(cwd, 1);

      if (sessions.length === 0) {
        console.log("No sessions found.");
        return;
      }

      printSessionDetails(sessions[0]);
    });

  cmd.command("show <id>")
    .description("Show details of a specific session")
    .action(async (id) => {
      const cwd = process.cwd();
      const { match, matches } = await findSessionById(cwd, id);

      if (match) {
        printSessionDetails(match);
        return;
      }

      if (matches.length === 0) {
        console.log(`Session not found: ${id}`);
        return;
      }

      if (matches.length > 1) {
        console.log(`Ambiguous session ID prefix: ${id}. Matches:`);
        for (const m of matches) {
          console.log(`  ${m.id}`);
        }
        return;
      }
    });

  return cmd;
}