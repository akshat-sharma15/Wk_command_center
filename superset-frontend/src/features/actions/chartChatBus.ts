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

/**
 * Lets any page ask the one globally-mounted AiChatWidget (see views/App.tsx)
 * to open scoped to a chart, instead of each page rendering a chat panel of
 * its own. The widget lives outside the router, so a listing page can't reach
 * it by props or context - but it also shouldn't have to, since there is only
 * ever one chat surface.
 */
export interface ChartChatTarget {
  chartId: number;
  chartName: string;
}

type Listener = (target: ChartChatTarget) => void;

const listeners = new Set<Listener>();

export const openChartChat = (target: ChartChatTarget): void => {
  listeners.forEach(listener => listener(target));
};

export const subscribeToChartChat = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
