/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Single source of truth for which Command Center Rails API origin the
// browser talks to. This project commonly switches between three -
// 182.156.33.77:9012 (local backend), a LAN IP, and a remote/live deployment -
// which used to mean editing .env and restarting both dev servers every
// time. Now:
//
// - superset_config.py's CSP connect-src permanently allows every
//   comma-separated origin listed in COMMAND_CENTER_API_ORIGIN (see that
//   file and .env), so CSP never blocks any of them regardless of which
//   one is actually targeted.
// - Which one IS actually targeted is a runtime choice read from
//   localStorage, so switching needs a reload but never a rebuild or a
//   server restart - see setCommandCenterApiHost()/window.ccSetApiHost()
//   below.
const STORAGE_KEY = 'cc_api_host_override';

// webpack.config.js bakes the FIRST origin from COMMAND_CENTER_API_ORIGIN's
// comma-separated list as this build-time default - used until an override
// is set below.
const BUILD_TIME_DEFAULT_HOST =
  process.env.COMMAND_CENTER_API_HOST || '182.156.33.77:9012';

function readOverride(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Blocked/unavailable localStorage (private browsing, etc.) - fall
    // back to the build-time default below, same as every other
    // best-effort localStorage read in this app.
    return null;
  }
}

export const COMMAND_CENTER_API_HOST =
  readOverride() || BUILD_TIME_DEFAULT_HOST;

export const CROSS_ORIGIN = {
  host: COMMAND_CENTER_API_HOST,
  mode: 'cors' as const,
};

/**
 * Dev convenience: switch which Command Center backend this browser talks
 * to, with no .env edit, rebuild, or server restart. From the browser's
 * devtools console:
 *
 *   ccSetApiHost('182.156.33.77:9012')      // local backend
 *   ccSetApiHost('192.168.0.253:3001')  // LAN IP
 *   ccSetApiHost('182.156.33.77:9012')  // remote/live (now the default)
 *   ccSetApiHost(null)                  // clear override, back to .env default
 *
 * Reloads the page so every data/*.ts module (each reads
 * COMMAND_CENTER_API_HOST once, at module load) picks up the new value.
 */
function setCommandCenterApiHost(host: string | null): void {
  try {
    if (host) {
      localStorage.setItem(STORAGE_KEY, host);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } finally {
    window.location.reload();
  }
}

declare global {
  interface Window {
    ccSetApiHost: typeof setCommandCenterApiHost;
    ccApiHost: string;
  }
}

if (typeof window !== 'undefined') {
  window.ccSetApiHost = setCommandCenterApiHost;
  window.ccApiHost = COMMAND_CENTER_API_HOST;
}
