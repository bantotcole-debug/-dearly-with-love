'use client';

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Letter = {
  id: string; title: string; body: string; mood: string;
  created_at: string; heart_count: number;
};

function getVisitorToken() {
  let token = localStorage.getItem("dearly-visitor-token");
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("dearly-visitor-token", token);
  }
  return token;
}

export default function Home() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState("A little hope");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadLetters() {
    const { data, error } = await supabase.from("letters")
      .select("id,title,body,mood,created_at,heart_count")
      .eq("status", "approved").order("created_at", { ascending: false }).limit(100);
    if (!error && data) setLetters(data as Letter[]);
  }

  useEffect(() => { void loadLetters(); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setStatus("");
    const { data, error } = await supabase.functions.invoke("submit-letter", {
      body: { title: title.trim(), body: body.trim(), mood }
    });
    setBusy(false);
    if (error || data?.error) {
      setStatus(data?.error || "Your letter could not be sent. Please try again later.");
      return;
    }
    setTitle(""); setBody("");
    setStatus(data?.message || "Your letter is in the review queue. Thank you for sharing. ♡");
  }

  async function heart(id: string) {
    const { error } = await supabase.functions.invoke("react-heart", {
      body: { letter_id: id, visitor_token: getVisitorToken() }
    });
    if (!error) await loadLetters();
  }

  async function report(id: string) {
    const reason = window.prompt("Why are you reporting this letter? (Spam, harmful content, personal information, other)");
    if (!reason) return;
    const { error } = await supabase.functions.invoke("report-letter", { body: { letter_id: id, reason } });
    window.alert(error ? "The report could not be sent. Please try again." : "Thank you. Your report has been received.");
  }

  const shown = letters.filter((l) => `${l.title} ${l.body}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <main>
      <div className="sparkle s1">✦</div><div className="sparkle s2">♡</div><div className="sparkle s3">✧</div>
      <header><a className="brand" href="#top">dearly<span>, with love</span> ♡</a><nav><a href="#write">Write a letter</a><a href="#wall">Letter wall</a></nav></header>
      <section className="hero" id="top">
        <div className="eyebrow">A LITTLE CORNER OF THE INTERNET</div>
        <h1>Some feelings are<br/><em>meant to be let out.</em></h1>
        <p>Leave a little piece of your heart here. No names, no pressure — just words, held gently.</p>
        <a className="cta" href="#write">Leave a letter <span>♡</span></a>
        <div className="hero-note">✿ your words are reviewed before they appear ✿</div>
      </section>
      <section className="write" id="write">
        <div className="section-kicker">A NOTE FROM YOU</div><h2>Dear someone, <em>somewhere...</em></h2>
        <p className="muted">Write what you've been carrying. Letters are reviewed before appearing on the wall.</p>
        <form onSubmit={submit}>
          <label>LETTER TITLE<input maxLength={90} required value={title} onChange={e=>setTitle(e.target.value)} placeholder="A little thing I never said..." /></label>
          <label>YOUR LETTER<textarea maxLength={5000} minLength={10} required value={body} onChange={e=>setBody(e.target.value)} placeholder="Dear you, today I wanted to say..." rows={7}/></label>
          <label>HOW DOES IT FEEL?<select value={mood} onChange={e=>setMood(e.target.value)}><option>A little hope</option><option>Missing someone</option><option>Grateful</option><option>Healing</option><option>Heartbroken</option><option>Just letting go</option></select></label>
          <button className="submit" disabled={busy}>{busy ? "Sending gently…" : "Send anonymously ♡"}</button>
          {status && <p className="status" role="status">{status}</p>}
          <small>Letters are submitted for review. Please don't include private information or identifying details.</small>
        </form>
      </section>
      <section className="wall" id="wall">
        <div className="section-kicker">THE COMMUNITY WALL</div><h2>Little notes, <em>big feelings.</em></h2>
        <p className="muted">A collection of words from people you'll probably never meet.</p>
        <input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a feeling or a few words…" aria-label="Search letters"/>
        <div className="letters">{shown.length ? shown.map(l=><article className="letter" key={l.id}>
          <div className="letter-top"><span>♡ A LETTER FROM A STRANGER</span><span>{new Date(l.created_at).toLocaleDateString()}</span></div>
          <h3>{l.title}</h3><p>{l.body}</p>
          <div className="letter-bottom"><span>✿ {l.mood}</span><div><button onClick={()=>void heart(l.id)} aria-label="Send a heart">♡ {l.heart_count || 0}</button><button onClick={()=>void report(l.id)} aria-label="Report letter">Report</button></div></div>
        </article>) : <div className="empty">{search ? "No letters match those words just yet." : "The wall is waiting for its first approved letters. ♡"}</div>}</div>
      </section>
      <footer><div className="footer-heart">♡</div><div className="brand">dearly<span>, with love</span></div><p>May your words find a soft place to land.</p><small>Made with tenderness · Please be kind to one another</small></footer>
    </main>
  );
}
