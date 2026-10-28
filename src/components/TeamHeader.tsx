"use client";
import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowDownRight, Users } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import TeamSelector from "./TeamSelector";
import RecordBadge from "./RecordBadge";
import styles from "./Home.module.css";

export default function TeamHeader() {
  const { selectedTeam: team } = useTeam();
  const headingStyle = { "--team-letters": Math.max(...team.name.split(" ").map(word => word.length)) } as CSSProperties;

  return (
    <section className={styles.hero}>
      <Image src="/images/arena-neutral.webp" alt="" fill sizes="100vw" preload className={styles.arenaImage} />
      <div key={`lights-${team.id}`} aria-hidden="true" className={styles.arenaLights}><span /><span /></div>
      <TeamSelector className={styles.crest} label={`Change focus team from ${team.name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.logo} alt="" width={176} height={176} loading="eager" className="h-full w-full object-contain" />
      </TeamSelector>
      <div key={team.id} className={`${styles.content} ${styles.identity}`}>
        <h1 style={headingStyle} className={`${styles.heading} ${team.name.length > 10 ? styles.longName : ""}`}>
          <span className={styles.city}>{team.city}</span>{" "}
          <span className={styles.teamName}>{team.name}</span>
        </h1>
        <p className={styles.conference}>{team.conference}ern Conference</p>
        <div className={styles.actions}>
          <Link href="/players" aria-label={`${team.name} players`} className={styles.roster}>
            <Users aria-hidden="true" className="h-4 w-4" />Players
          </Link>
          <div className={styles.selector}>
            <TeamSelector />
          </div>
          <div className={`${styles.record} empty:hidden`}><RecordBadge /></div>
        </div>
        <a href="#home-games" className={styles.seat}>
          <span className={styles.seatBall} aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="16" cy="16" r="14" />
              <path d="M2 16h28M16 2v28M6 6c13 4 13 16 0 20M26 6C13 10 13 22 26 26" />
            </svg>
          </span>
          <span><strong>Your courtside corner.</strong><span>Settle in. Catch up with the {team.name}.</span></span>
          <ArrowDownRight aria-hidden="true" className={styles.seatArrow} size={20} />
        </a>
      </div>
    </section>
  );
}
