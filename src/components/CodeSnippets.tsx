import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import { ChaosEndpoint } from '../types';

interface CodeSnippetsProps {
  endpoint: ChaosEndpoint;
}

type SnippetLang = 'curl' | 'js' | 'python' | 'go' | 'rust';

export const CodeSnippets: React.FC<CodeSnippetsProps> = ({ endpoint }) => {
  const [activeLang, setActiveLang] = useState<SnippetLang>('curl');
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = endpoint?.slug ? `${origin}/e/${endpoint.slug}` : '';

  const snippets: Record<SnippetLang, { title: string; code: string }> = {
    curl: {
      title: 'cURL',
      code: `curl -i -X GET "${url}" \\
  -H "Accept: application/json" \\
  -H "User-Agent: HiccupTestClient/1.0"`
    },
    js: {
      title: 'JavaScript',
      code: `async function testResilience() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch("${url}", {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    
    if (!res.ok) {
      console.warn("HTTP Error:", res.status, res.statusText);
      return;
    }
    
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error("Request Timed Out");
    } else {
      console.error("Socket / Network Error:", err);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

testResilience();`
    },
    python: {
      title: 'Python',
      code: `import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
)

session = requests.Session()
session.mount("https://", HTTPAdapter(max_retries=retry_strategy))

try:
    response = session.get("${url}", timeout=5.0)
    print("Status:", response.status_code)
    print("Response:", response.text)
except requests.exceptions.Timeout:
    print("Timed out after 5 seconds")
except requests.exceptions.ConnectionError as e:
    print("Connection error:", e)`
    },
    go: {
      title: 'Go',
      code: `package main

import (
    "context"
    "fmt"
    "io"
    "net/http"
    "time"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", "${url}", nil)
    if err != nil {
        panic(err)
    }

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Printf("Status: %d\\nBody: %s\\n", resp.StatusCode, string(body))
}`
    },
    rust: {
      title: 'Rust',
      code: `use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()?;

    match client.get("${url}").send().await {
        Ok(res) => {
            println!("Status: {}", res.status());
            let body = res.text().await?;
            println!("Body: {}", body);
        }
        Err(e) if e.is_timeout() => {
            eprintln!("Timed out!");
        }
        Err(e) => {
            eprintln!("Network Error: {}", e);
        }
    }

    Ok(())
}`
    }
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(snippets[activeLang].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 space-y-4 font-mono shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-zinc-900 font-sans">Client Code Integration</h3>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center space-x-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200/80">
          {(Object.keys(snippets) as SnippetLang[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`px-2.5 py-1 text-[11px] rounded-md transition-all ${
                activeLang === lang
                  ? 'bg-white text-zinc-900 font-bold shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {snippets[lang].title}
            </button>
          ))}
        </div>
      </div>

      {/* Code Box */}
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-800/80 bg-zinc-900 text-[11px] text-zinc-400">
          <span>{snippets[activeLang].title} snippet</span>
          <button
            onClick={copySnippet}
            className="flex items-center space-x-1 text-zinc-300 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 text-xs text-amber-300/90 overflow-x-auto whitespace-pre leading-relaxed selection:bg-zinc-800">
          {snippets[activeLang].code}
        </pre>
      </div>
    </div>
  );
};


