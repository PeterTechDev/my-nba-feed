"use client";
import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { Users } from "lucide-react";
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={team.logo} alt="" width={176} height={176} loading="eager" className={styles.crest} />
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
      </div>
    </section>
  );
}
