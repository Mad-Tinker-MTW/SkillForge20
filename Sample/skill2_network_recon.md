# Network Reconnaissance
## Skill: Nmap + Netdiscover + Wireshark
### RSA Framework Application — Mad Tinker's Workshop

---

## Deconstruct

- Host discovery fundamentals (high) — nmap -sn ping sweeps, netdiscover ARP scanning. Know when each works and why ARP wins on local segments.
- Port scanning techniques (high) — TCP SYN, connect, UDP scans and stealth tradeoffs. Timing templates T1 through T5.
- Service and version detection (high) — nmap -sV and -A flags. Banner grabbing. Understanding what version info reveals about attack surface.
- OS fingerprinting (high) — nmap -O and TTL analysis. Passive fingerprinting via p0f. Why this matters for exploit selection.
- Wireshark packet analysis (high) — Capture filters vs display filters. Protocol dissection. Following TCP streams. Cleartext credential identification.
- NSE scripting engine (medium) — nmap script categories: auth, vuln, brute, discovery. Targeted scripts vs full category scans.
- Network topology mapping (medium) — Traceroute, TTL analysis, identifying routers and segment boundaries. Building the network picture.
- Passive reconnaissance (medium) — Shodan, Censys, theHarvester. OSINT before active scanning. Legal and operational considerations.
- Scan output formats (low) — nmap -oN, -oX, -oG. Parsing grepable output. Feeding results into downstream tools.
- Firewall and IDS evasion basics (low) — Fragmentation, decoy scans, timing adjustments. Understanding detection thresholds.

---

## Self-Correct

- Scan result validation (high) — Confirm open ports with manual nc or telnet before acting on results. Do not trust the scan alone.
- False positive identification (high) — UDP scans produce many false positives. Verify with -sV. Understand why filtered differs from closed.
- Wireshark filter syntax (high) — Test display filters on known traffic. Common mistakes: = vs == and port vs tcp.port.
- Nmap timing calibration (medium) — Too fast loses accuracy. Too slow misses time-sensitive services. Benchmark T3 vs T4 in your lab.
- Reference: nmap book online (medium) — nmap.org/book/toc.html. Chapter 4 covers port scanning in depth.
- Wireshark sample captures (low) — wiki.wireshark.org/SampleCaptures. Known-good pcap files for filter practice without live traffic.

---

## Barriers

- Lab network isolation (high) — Dedicated virtual network only. Do not scan production or public networks without authorization.
- Legal authorization documentation (high) — Document scope explicitly. CTF platforms and home lab VMs satisfy this.
- Wireshark capture permissions (high) — Linux requires root or cap_net_raw. Windows needs npcap installed. Verify before sessions.
- Test target setup (high) — Metasploitable2 or VulnHub VMs as scan targets. Known vulnerability sets make validation straightforward.
- Wireshark pcap storage (medium) — Set file size limits and rotation before long captures. Large captures fill disk fast.
- Nmap on Windows path issues (medium) — Add nmap to PATH. Confirm npcap version compatibility. Test with nmap --version first.

---

## Practice

- Session 1: nmap baseline (high) — Scan Metasploitable2 with default flags, then -sV, then -A. Compare output depth. Document flag effects.
- Session 2: timing and stealth (high) — Same target with T1 through T4. Record scan duration and port discovery accuracy at each level.
- Session 3: NSE scripts (high) — Run vuln category against Metasploitable2. Document each finding. Cross-reference with known CVEs.
- Session 4: Wireshark capture (high) — Capture a full nmap -A scan. Identify SYN packets, RST responses, banner exchanges in the stream.
- Session 5: passive recon sprint (medium) — Use Shodan and theHarvester on a domain you own. Document what is publicly visible.
- Session 6: topology mapping (medium) — Trace routes to 5 targets in the lab. Draw the segment map. Identify gateway hops.
- Session 7: output parsing (medium) — Export nmap results in all three formats. Write a grep pipeline to extract open ports and service versions.
- Session 8: tool comparison write-up (medium) — Compare nmap vs netdiscover vs Wireshark for discovery speed, accuracy, and stealth.

