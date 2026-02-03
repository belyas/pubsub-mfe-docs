// src/topic-matcher.ts
var SEGMENT_DELIMITER = ".";
var SINGLE_WILDCARD = "+";
var MULTI_WILDCARD = "#";
var matcherCache = /* @__PURE__ */ new Map();
var MAX_CACHE_SIZE = 1e3;
function compileMatcher(pattern) {
  const cached = matcherCache.get(pattern);
  if (cached) {
    return cached;
  }
  if (!pattern || typeof pattern !== "string") {
    throw new Error(`Invalid topic pattern: ${pattern}.`);
  }
  const segments = splitTopic(pattern);
  const matcherSegments = [];
  let hasWildcards = false;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment === "") {
      throw new Error(`Invalid topic pattern "${pattern}": empty segment at position ${i}.`);
    }
    if (segment === MULTI_WILDCARD) {
      if (i !== segments.length - 1) {
        throw new Error(`Invalid topic pattern "${pattern}": # wildcard must be at the end.`);
      }
      hasWildcards = true;
      matcherSegments.push({ type: "multi" });
    } else if (segment === SINGLE_WILDCARD) {
      hasWildcards = true;
      matcherSegments.push({ type: "single" });
    } else {
      if (!/^[a-zA-Z0-9_-]+$/.test(segment)) {
        throw new Error(
          `Invalid topic pattern "${pattern}": segment "${segment}" contains invalid characters. Use alphanumeric, hyphen, or underscore only.`
        );
      }
      matcherSegments.push({ type: "literal", value: segment });
    }
  }
  const matcher = {
    pattern,
    hasWildcards,
    segments: matcherSegments
  };
  if (matcherCache.size >= MAX_CACHE_SIZE) {
    const firstKey = matcherCache.keys().next().value;
    matcherCache.delete(firstKey);
  }
  matcherCache.set(pattern, matcher);
  return matcher;
}
function matchTopic(topic, matcher) {
  if (!matcher.hasWildcards) {
    return topic === matcher.pattern;
  }
  const topicSegments = splitTopic(topic);
  if (topicSegments.some((seg) => seg === "")) {
    return false;
  }
  const patternSegments = matcher.segments;
  return matchSegments(topicSegments, 0, patternSegments, 0);
}
function matchSegments(topicSegments, topicIndex, patternSegments, patternIndex) {
  if (patternIndex >= patternSegments.length) {
    return topicIndex >= topicSegments.length;
  }
  const patternSegment = patternSegments[patternIndex];
  switch (patternSegment.type) {
    case "multi":
      return true;
    case "single":
      if (topicIndex >= topicSegments.length) {
        return false;
      }
      return matchSegments(topicSegments, topicIndex + 1, patternSegments, patternIndex + 1);
    case "literal":
      if (topicIndex >= topicSegments.length) {
        return false;
      }
      if (topicSegments[topicIndex] !== patternSegment.value) {
        return false;
      }
      return matchSegments(topicSegments, topicIndex + 1, patternSegments, patternIndex + 1);
  }
}
function validatePublishTopic(topic) {
  if (!topic || typeof topic !== "string") {
    throw new Error(`Invalid topic: ${topic || "empty"}.`);
  }
  if (topic.includes(SINGLE_WILDCARD) || topic.includes(MULTI_WILDCARD)) {
    throw new Error(
      `Invalid publish topic "${topic}": wildcards (+ or #) are not allowed in publish topics. Use exact topic names for publishing.`
    );
  }
  const segments = splitTopic(topic);
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment === "") {
      throw new Error(`Invalid topic "${topic}": empty segment at position ${i}`);
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(segment)) {
      throw new Error(
        `Invalid topic "${topic}": segment "${segment}" contains invalid characters. Use alphanumeric, hyphen, or underscore only.`
      );
    }
  }
}
function splitTopic(topic) {
  return topic.split(SEGMENT_DELIMITER);
}
function joinTopic(...segments) {
  return segments.join(SEGMENT_DELIMITER);
}
function clearMatcherCache() {
  matcherCache.clear();
}
function getMatcherCacheSize() {
  return matcherCache.size;
}
function getCache() {
  return matcherCache;
}
export {
  clearMatcherCache,
  compileMatcher,
  getCache,
  getMatcherCacheSize,
  joinTopic,
  matchTopic,
  splitTopic,
  validatePublishTopic
};
//# sourceMappingURL=matcher.js.map
