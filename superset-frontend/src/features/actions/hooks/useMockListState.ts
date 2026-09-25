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
import { useCallback, useMemo, useState } from 'react';
import { ListViewFilterOperator as FilterOperator } from 'src/components';
import type {
  ListViewFetchDataConfig,
  ListViewFilterValue,
} from 'src/components/ListView/types';

const DEFAULT_FETCH_CONFIG: ListViewFetchDataConfig = {
  pageIndex: 0,
  pageSize: 25,
  sortBy: [],
  filters: [],
};

// Supports dot-path column ids (e.g. `event.name`) for columns backed by a
// nested {id, name} reference, matching how react-table accessors work.
const getField = (row: object, key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (value, segment) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[segment]
          : undefined,
      row,
    );

const extractFilterValue = (
  value: ListViewFilterValue['value'],
): string | number | boolean | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
    return (value as { value: string | number }).value;
  }
  return value as string | number | boolean;
};

function applyListViewFetch<T extends object>(
  source: T[],
  conf: ListViewFetchDataConfig,
): { rows: T[]; count: number } {
  let filtered = source;
  conf.filters.forEach(filter => {
    const value = extractFilterValue(filter.value);
    if (value === undefined || value === '') return;
    filtered = filtered.filter(row => {
      const cell = String(getField(row, filter.id) ?? '').toLowerCase();
      const needle = String(value).toLowerCase();
      return filter.operator === FilterOperator.Equals
        ? cell === needle
        : cell.includes(needle);
    });
  });

  const sort = conf.sortBy[0];
  if (sort) {
    const { id, desc } = sort;
    filtered = [...filtered].sort((a, b) => {
      const cmp = String(getField(a, id) ?? '').localeCompare(
        String(getField(b, id) ?? ''),
      );
      return desc ? -cmp : cmp;
    });
  }

  const start = conf.pageIndex * conf.pageSize;
  return {
    rows: filtered.slice(start, start + conf.pageSize),
    count: filtered.length,
  };
}

/**
 * Drives a `ListView`'s search/sort/pagination over an already-fetched
 * array. The caller owns fetching `items` (see data/*.ts) and loading
 * state - this hook is a pure, synchronous view over whatever it's given,
 * so it works the same whether `items` came from a mock store or a real
 * API response.
 */
export function useMockListState<T extends object>(items: T[]) {
  const [fetchConfig, setFetchConfig] =
    useState<ListViewFetchDataConfig>(DEFAULT_FETCH_CONFIG);

  const { rows, count } = useMemo(
    () => applyListViewFetch(items, fetchConfig),
    [items, fetchConfig],
  );

  const fetchData = useCallback((conf: ListViewFetchDataConfig) => {
    setFetchConfig(conf);
  }, []);

  return { rows, count, fetchData };
}
