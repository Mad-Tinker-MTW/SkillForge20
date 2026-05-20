# SkillForge20 — User Guide
## Mad Tinker's Workshop | RSA Program Documentation

---

## Purpose

This tracker applies Josh Kaufman's five-step rapid skill acquisition framework to three complementary security skills. The goal is not mastery. The goal is functional competence, defined here as knowing enough to critique existing tools and produce a credible build document for a better one.

Each skill takes you through the same five phases, logged across 20 hours of deliberate practice spread over 7 weeks.

---

## The Framework — Five Steps

Kaufman's original framework has five steps, not four. The fifth is the one most people skip, and it is the reason most people quit early.

### Step 1 — Pre-Commit
**Tracker tab: 00. pre-commit**

Decide before you start that you will complete all 20 hours regardless of how frustrating the first few sessions feel. Write it down. Set your target end date. Define what done looks like for you specifically.

This step exists because early skill acquisition always feels terrible. You are incompetent, everything takes too long, and nothing works the way you expect. That feeling is not a signal to stop. It is the learning happening. Pre-committing in writing gives you something to return to when session 3 feels like a disaster.

Cards in this section:
- Skill name and stated end goal
- Target completion date
- Definition of done (what will you be able to do or produce?)
- Personal commitment statement

### Step 2 — Deconstruct the Skill
**Tracker tab: 01. deconstruct**

Break the skill into its actual component sub-skills. Most skills that look like one thing are really ten things. Your job here is to figure out which two or three of those ten things will get you to useful competence fastest.

Color coding tells you what to practice first. High priority cards (red left border) are the core sub-skills that unlock the rest. Medium priority (amber) supports the core. Low priority (green) is nice to have once the core is solid.

For the security skills in this program, deconstruction means separating the tool mechanics (flags, commands, modes) from the conceptual layer (why you would use this attack type, what the output actually means) and from the workflow layer (how you move between tools, how you read failure).

### Step 3 — Learn Enough to Self-Correct
**Tracker tab: 02. self-correct**

Before you practice, gather just enough reference material to recognize when you are doing something wrong. Not enough to become an expert before you start. Enough to diagnose your own mistakes.

For these security tools this means: know where the official documentation is, know what a good result looks like vs a misconfigured one, and have a mental checklist for when an attack fails. Cards in this section are checkpoints and reference links, not study material.

The key question for every card here: if this thing went wrong during a session, would I know it went wrong, and would I know where to look?

### Step 4 — Remove Barriers to Practice
**Tracker tab: 03. barriers**

Identify everything that will prevent you from sitting down and practicing. Then eliminate it before your first session, not during.

Barriers in this program fall into three categories. Environment barriers are things like missing VMs, unconfigured drivers, undownloaded wordlists. Legal barriers are scope and authorization. Cognitive barriers are distractions and unclear session goals.

A card moves to done when the barrier is gone, not when you have a plan to remove it.

### Step 5 — Practice for 20 Hours
**Tracker tab: 04. practice + session log**

The practice tab holds your defined session blocks. Each block has a specific goal tied back to the high-priority sub-skills from the deconstruct phase. Generic practice sessions produce generic results. Every session should have a question it is trying to answer.

The session log tab is your evidence trail. Log date, hours, and what you learned or broke. For the RSA deliverable this log is your primary documentation artifact.

The 20-hour target is the minimum to push through the frustration dip and reach a point where the skill feels usable. It is not a ceiling.

---

## The 7-Week Schedule

20 hours across 7 weeks is approximately 2.85 hours per week. Structured as focused blocks this is manageable alongside coursework.

```
Week 1   Pre-commit + Deconstruct + barrier removal
         Hours target: 2-3
         Goal: environment ready, all barriers cleared, sub-skills ranked

Week 2   Core sub-skills, sessions 1-2
         Hours target: 3
         Goal: first tool baseline established, output reading practiced

Week 3   Core sub-skills, sessions 3-4
         Hours target: 3
         Goal: second and third tool baselines, failure diagnosis practiced

Week 4   Supporting sub-skills, sessions 5-6
         Hours target: 3
         Goal: edge cases and cross-tool comparison started

Week 5   Supporting sub-skills, sessions 7
         Hours target: 3
         Goal: full tool comparison matrix complete

Week 6   Synthesis, session 8
         Hours target: 3
         Goal: GUI build document drafted from synthesized pain points

Week 7   Buffer + documentation
         Hours target: 2-3
         Goal: session log reviewed, build document finalized, RSA write-up complete
```

Total: 19-21 hours. The buffer week absorbs schedule slippage without blowing the 20-hour target.

---

## How the Three Skills Connect

These are not three independent skills. They are three phases of the same operation, each one feeding the next.

**Skill 1 — Password Auditing** (Hashcat + JtR + Hydra)
You learn to crack credential hashes offline and attack live services online. This is the credential acquisition layer.

**Skill 2 — Network Reconnaissance** (Nmap + Netdiscover + Wireshark)
You learn to find the target surface before attacking it. Host discovery, port scanning, service fingerprinting, and packet capture. This is what tells you where to point Skill 1.

**Skill 3 — Post-Exploitation** (Metasploit + Mimikatz + BloodHound)
You learn what happens after credentials are obtained. Session management, privilege escalation, credential dumping, and Active Directory attack path mapping. This is where Skill 1's output gets used.

The build document produced at the end of each skill is also connected. Across three build documents you are designing three components of a unified security operations GUI, one for credential work, one for reconnaissance, one for post-exploitation. Together they make a coherent portfolio artifact.

---

## Using the Tracker

**Creating a skill**
Hit + new skill in the top bar. Name it exactly as it appears in your RSA documentation so the two stay in sync.

**Loading import files**
Create the skill first, then go to the import tab and drop the CSV file for that skill. The phase column routes each card to the correct section automatically. Cards with (high) in the title get flagged as high priority.

**Saving**
The tracker auto-saves to your browser on every change. Use the manual save button as a checkpoint. Use the export JSON function in the all skills tab to create a backup you can move between machines.

**Session logging**
Log every session the same day. Date, hours, and a note on what you worked on, what clicked, and what broke. The broken stuff is the most valuable documentation for the build document later.

**Card status**
Move cards from to do to in progress when you start working on that sub-skill. Mark done when you can explain it and apply it without looking it up. The progress bar tracks session hours, not card completion, so both move independently.

**The build document sprint**
Session 8 in each skill's practice tab is the build document sprint. By that point you have 16-18 hours of logged friction with the tools. The build document writes itself from your session notes. It is not a separate research project. It is a synthesis of everything the session log already contains.

---

## RSA Deliverable Checklist

- [ ] Three skills created in tracker with names matching RSA documentation
- [ ] Pre-commit card complete for each skill with target date and definition of done
- [ ] All CSV cards imported and reviewed
- [ ] Barriers cleared before week 2 sessions begin
- [ ] Session log entries for every practice block (minimum 8 per skill)
- [ ] Tool comparison matrix complete for each skill (session 7)
- [ ] GUI build document drafted for each skill (session 8)
- [ ] 20-hour minimum reached on the session log progress bar
- [ ] Session log exported as evidence artifact

