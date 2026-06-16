import { C as P, b as Z, G as k, a as H, Q as G } from "./QuantizedMeshLoaderBase-Cn33qyYc.js";
import { L as A, r as F, b as E } from "./LoaderBase-ATuDWTDB.js";
function m(h) {
  return h.implicitTilingData.root.implicitTiling.subdivisionScheme === "OCTREE";
}
function w(h) {
  return m(h) ? 8 : 4;
}
function R(h, t) {
  if (!h)
    return [0, 0, 0];
  const i = h.implicitTilingData.x, e = h.implicitTilingData.y, r = h.implicitTilingData.z, n = 2 * i + t % 2, s = 2 * e + Math.floor(t / 2) % 2, a = m(h) ? 2 * r + Math.floor(t / 4) % 2 : 0;
  return [n, s, a];
}
class v {
  constructor(t, i) {
    this.parent = t, this.children = [], this.geometricError = 0, this.boundingVolume = null;
    const [e, r, n] = R(t, i);
    this.implicitTilingData = {
      level: t.implicitTilingData.level + 1,
      root: t.implicitTilingData.root,
      subtreeIdx: i,
      x: e,
      y: r,
      z: n
    };
  }
  static clone(t) {
    return {
      parent: t.parent,
      children: [],
      geometricError: t.geometricError,
      boundingVolume: t.boundingVolume,
      implicitTilingData: {
        ...t.implicitTilingData
      }
    };
  }
}
class B extends A {
  constructor(t) {
    super(), this.tile = t, this.rootTile = t.implicitTilingData.root, this.workingPath = null;
  }
  /**
   * A helper object for storing the two parts of the subtree binary
   *
   * @typedef {Object} Subtree
   * @property {number} version
   * @property {JSON} subtreeJson
   * @property {ArrayBuffer} subtreeByte
   * @private
   */
  /**
   *
   * @param {ArrayBuffer} buffer
   * @returns {Subtree}
   */
  parseBuffer(t) {
    const i = new DataView(t);
    let e = 0;
    const r = F(i);
    console.assert(r === "subt", 'SUBTREELoader: The magic bytes equal "subt".'), e += 4;
    const n = i.getUint32(e, !0);
    console.assert(n === 1, 'SUBTREELoader: The version listed in the header is "1".'), e += 4;
    const s = i.getUint32(e, !0);
    e += 8;
    const a = i.getUint32(e, !0);
    e += 8;
    const o = JSON.parse(E(new Uint8Array(t, e, s)));
    e += s;
    const c = t.slice(e, e + a);
    return {
      version: n,
      subtreeJson: o,
      subtreeByte: c
    };
  }
  async parse(t) {
    const i = this.parseBuffer(t), e = i.subtreeJson;
    e.contentAvailabilityHeaders = [].concat(e.contentAvailability);
    const r = this.preprocessBuffers(e.buffers), n = this.preprocessBufferViews(
      e.bufferViews,
      r
    );
    this.markActiveBufferViews(e, n);
    const s = await this.requestActiveBuffers(
      r,
      i.subtreeByte
    ), a = this.parseActiveBufferViews(n, s);
    this.parseAvailability(i, e, a), this.expandSubtree(this.tile, i);
  }
  /**
   * Determine which buffer views need to be loaded into memory. This includes:
   *
   * <ul>
   * <li>The tile availability bitstream (if a bitstream is defined)</li>
   * <li>The content availability bitstream(s) (if a bitstream is defined)</li>
   * <li>The child subtree availability bitstream (if a bitstream is defined)</li>
   * </ul>
   *
   * <p>
   * This function modifies the buffer view headers' isActive flags in place.
   * </p>
   *
   * @param {JSON} subtreeJson The JSON chunk from the subtree
   * @param {BufferViewHeader[]} bufferViewHeaders The preprocessed buffer view headers
   * @private
   */
  markActiveBufferViews(t, i) {
    let e;
    const r = t.tileAvailability;
    isNaN(r.bitstream) ? isNaN(r.bufferView) || (e = i[r.bufferView]) : e = i[r.bitstream], e && (e.isActive = !0, e.bufferHeader.isActive = !0);
    const n = t.contentAvailabilityHeaders;
    for (let a = 0; a < n.length; a++)
      e = void 0, isNaN(n[a].bitstream) ? isNaN(n[a].bufferView) || (e = i[n[a].bufferView]) : e = i[n[a].bitstream], e && (e.isActive = !0, e.bufferHeader.isActive = !0);
    e = void 0;
    const s = t.childSubtreeAvailability;
    isNaN(s.bitstream) ? isNaN(s.bufferView) || (e = i[s.bufferView]) : e = i[s.bitstream], e && (e.isActive = !0, e.bufferHeader.isActive = !0);
  }
  /**
   * Go through the list of buffers and gather all the active ones into
   * a dictionary.
   * <p>
   * The results are put into a dictionary object. The keys are indices of
   * buffers, and the values are Uint8Arrays of the contents. Only buffers
   * marked with the isActive flag are fetched.
   * </p>
   * <p>
   * The internal buffer (the subtree's binary chunk) is also stored in this
   * dictionary if it is marked active.
   * </p>
   * @param {BufferHeader[]} bufferHeaders The preprocessed buffer headers
   * @param {ArrayBuffer} internalBuffer The binary chunk of the subtree file
   * @returns {Object} buffersU8 A dictionary of buffer index to a Uint8Array of its contents.
   * @private
   */
  async requestActiveBuffers(t, i) {
    const e = [];
    for (let s = 0; s < t.length; s++) {
      const a = t[s];
      if (!a.isActive)
        e.push(Promise.resolve());
      else if (a.isExternal) {
        const o = this.parseImplicitURIBuffer(
          this.tile,
          this.rootTile.implicitTiling.subtrees.uri,
          a.uri
        ), c = fetch(o, this.fetchOptions).then((l) => {
          if (!l.ok)
            throw new Error(`SUBTREELoader: Failed to load external buffer from ${a.uri} with error code ${l.status}.`);
          return l.arrayBuffer();
        }).then((l) => new Uint8Array(l));
        e.push(c);
      } else
        e.push(Promise.resolve(new Uint8Array(i)));
    }
    const r = await Promise.all(e), n = {};
    for (let s = 0; s < r.length; s++) {
      const a = r[s];
      a && (n[s] = a);
    }
    return n;
  }
  /**
   * Go through the list of buffer views, and if they are marked as active,
   * extract a subarray from one of the active buffers.
   *
   * @param {BufferViewHeader[]} bufferViewHeaders
   * @param {Object} buffersU8 A dictionary of buffer index to a Uint8Array of its contents.
   * @returns {Object} A dictionary of buffer view index to a Uint8Array of its contents.
   * @private
   */
  parseActiveBufferViews(t, i) {
    const e = {};
    for (let r = 0; r < t.length; r++) {
      const n = t[r];
      if (!n.isActive)
        continue;
      const s = n.byteOffset, a = s + n.byteLength, o = i[n.buffer];
      e[r] = o.slice(s, a);
    }
    return e;
  }
  /**
   * A buffer header is the JSON header from the subtree JSON chunk plus
   * a couple extra boolean flags for easy reference.
   *
   * Buffers are assumed inactive until explicitly marked active. This is used
   * to avoid fetching unneeded buffers.
   *
   * @typedef {Object} BufferHeader
   * @property {boolean} isActive Whether this buffer is currently used.
   * @property {string} [uri] The URI of the buffer (external buffers only)
   * @property {number} byteLength The byte length of the buffer, including any padding contained within.
   * @private
   */
  /**
   * Iterate over the list of buffers from the subtree JSON and add the isActive field for easier parsing later.
   * This modifies the objects in place.
   * @param {Object[]} [bufferHeaders=[]] The JSON from subtreeJson.buffers.
   * @returns {BufferHeader[]} The same array of headers with additional fields.
   * @private
   */
  preprocessBuffers(t = []) {
    for (let i = 0; i < t.length; i++) {
      const e = t[i];
      e.isActive = !1, e.isExternal = !!e.uri;
    }
    return t;
  }
  /**
   * A buffer view header is the JSON header from the subtree JSON chunk plus
   * the isActive flag and a reference to the header for the underlying buffer.
   *
   * @typedef {Object} BufferViewHeader
   * @property {BufferHeader} bufferHeader A reference to the header for the underlying buffer
   * @property {boolean} isActive Whether this bufferView is currently used.
   * @property {number} buffer The index of the underlying buffer.
   * @property {number} byteOffset The start byte of the bufferView within the buffer.
   * @property {number} byteLength The length of the bufferView. No padding is included in this length.
   * @private
   */
  /**
   * Iterate the list of buffer views from the subtree JSON and add the
   * isActive flag. Also save a reference to the bufferHeader.
   *
   * @param {Object[]} [bufferViewHeaders=[]] The JSON from subtree.bufferViews.
   * @param {BufferHeader[]} bufferHeaders The preprocessed buffer headers.
   * @returns {BufferViewHeader[]} The same array of bufferView headers with additional fields.
   * @private
   */
  preprocessBufferViews(t = [], i) {
    for (let e = 0; e < t.length; e++) {
      const r = t[e];
      r.bufferHeader = i[r.buffer], r.isActive = !1, r.isExternal = r.bufferHeader.isExternal;
    }
    return t;
  }
  /**
   * Parse the three availability bitstreams and store them in the subtree.
   *
   * @param {Subtree} subtree The subtree to modify.
   * @param {Object} subtreeJson The subtree JSON.
   * @param {Object} bufferViewsU8 A dictionary of buffer view index to a Uint8Array of its contents.
   * @private
   */
  parseAvailability(t, i, e) {
    const r = w(this.rootTile), n = this.rootTile.implicitTiling.subtreeLevels, s = (Math.pow(r, n) - 1) / (r - 1), a = Math.pow(r, n);
    t._tileAvailability = this.parseAvailabilityBitstream(
      i.tileAvailability,
      e,
      s
    ), t._contentAvailabilityBitstreams = [];
    for (let o = 0; o < i.contentAvailabilityHeaders.length; o++) {
      const c = this.parseAvailabilityBitstream(
        i.contentAvailabilityHeaders[o],
        e,
        // content availability has the same length as tile availability.
        s
      );
      t._contentAvailabilityBitstreams.push(c);
    }
    t._childSubtreeAvailability = this.parseAvailabilityBitstream(
      i.childSubtreeAvailability,
      e,
      a
    );
  }
  /**
   * Given the JSON describing an availability bitstream, turn it into an
   * in-memory representation using an object. This handles bitstreams from a bufferView.
   *
   * @param {Object} availabilityJson A JSON object representing the availability.
   * @param {Object} bufferViewsU8 A dictionary of buffer view index to its Uint8Array contents.
   * @param {number} lengthBits The length of the availability bitstream in bits.
   * @returns {Object}
   * @private
   */
  parseAvailabilityBitstream(t, i, e) {
    if (!isNaN(t.constant))
      return {
        constant: !!t.constant,
        lengthBits: e
      };
    let r;
    return isNaN(t.bitstream) ? isNaN(t.bufferView) || (r = i[t.bufferView]) : r = i[t.bitstream], {
      bitstream: r,
      lengthBits: e
    };
  }
  /**
   * Expand a single subtree tile. This transcodes the subtree into
   * a tree of {@link SubtreeTile}. The root of this tree is stored in
   * the placeholder tile's children array. This method also creates
   * tiles for the child subtrees to be lazily expanded as needed.
   *
   * @param {Object | SubtreeTile} subtreeRoot The first node of the subtree.
   * @param {Subtree} subtree The parsed subtree.
   * @private
   */
  expandSubtree(t, i) {
    const e = v.clone(t);
    for (let s = 0; i && s < i._contentAvailabilityBitstreams.length; s++)
      if (i && this.getBit(i._contentAvailabilityBitstreams[s], 0)) {
        e.content = { uri: this.parseImplicitURI(t, this.rootTile.content.uri) };
        break;
      }
    t.children.push(e);
    const r = this.transcodeSubtreeTiles(
      e,
      i
    ), n = this.listChildSubtrees(i, r);
    for (let s = 0; s < n.length; s++) {
      const a = n[s], o = a.tile, c = this.deriveChildTile(
        null,
        o,
        null,
        a.childMortonIndex
      );
      c.content = { uri: this.parseImplicitURI(c, this.rootTile.implicitTiling.subtrees.uri) }, o.children.push(c);
    }
  }
  /**
   * Transcode the implicitly defined tiles within this subtree and generate
   * explicit {@link SubtreeTile} objects. This function only transcodes tiles,
   * child subtrees are handled separately.
   *
   * @param {Object | SubtreeTile} subtreeRoot The root of the current subtree.
   * @param {Subtree} subtree The subtree to get availability information.
   * @returns {Array} The bottom row of transcoded tiles. This is helpful for processing child subtrees.
   * @private
   */
  transcodeSubtreeTiles(t, i) {
    let e = [t], r = [];
    for (let n = 1; n < this.rootTile.implicitTiling.subtreeLevels; n++) {
      const s = w(this.rootTile), a = (Math.pow(s, n) - 1) / (s - 1), o = s * e.length;
      for (let c = 0; c < o; c++) {
        const l = a + c, u = c >> Math.log2(s), f = e[u];
        if (!this.getBit(i._tileAvailability, l)) {
          r.push(void 0);
          continue;
        }
        const p = this.deriveChildTile(
          i,
          f,
          l,
          c
        );
        f.children.push(p), r.push(p);
      }
      e = r, r = [];
    }
    return e;
  }
  /**
   * Given a parent tile and information about which child to create, derive
   * the properties of the child tile implicitly.
   * <p>
   * This creates a real tile for rendering.
   * </p>
   *
   * @param {Subtree} subtree The subtree the child tile belongs to.
   * @param {Object | SubtreeTile} parentTile The parent of the new child tile.
   * @param {number} childBitIndex The index of the child tile within the tile's availability information.
   * @param {number} childMortonIndex The morton index of the child tile relative to its parent.
   * @returns {SubtreeTile} The new child tile.
   * @private
   */
  deriveChildTile(t, i, e, r) {
    const n = new v(i, r);
    n.boundingVolume = this.getTileBoundingVolume(n), n.geometricError = this.getGeometricError(n);
    for (let s = 0; t && s < t._contentAvailabilityBitstreams.length; s++)
      if (t && this.getBit(t._contentAvailabilityBitstreams[s], e)) {
        n.content = { uri: this.parseImplicitURI(n, this.rootTile.content.uri) };
        break;
      }
    return n;
  }
  /**
   * Get a bit from the bitstream as a Boolean. If the bitstream
   * is a constant, the constant value is returned instead.
   *
   * @param {ParsedBitstream} object
   * @param {number} index The integer index of the bit.
   * @returns {boolean} The value of the bit.
   * @private
   */
  getBit(t, i) {
    if (i < 0 || i >= t.lengthBits)
      throw new Error("Bit index out of bounds.");
    if (t.constant !== void 0)
      return t.constant;
    const e = i >> 3, r = i % 8;
    return (new Uint8Array(t.bitstream)[e] >> r & 1) === 1;
  }
  /**
   * //TODO Adapt for Sphere
   * To maintain numerical stability during this subdivision process,
   * the actual bounding volumes should not be computed progressively by subdividing a non-root tile volume.
   * Instead, the exact bounding volumes are computed directly for a given level.
   * @param {Object | SubtreeTile} tile
   * @returns {Object} object containing the bounding volume.
   */
  getTileBoundingVolume(t) {
    const i = {};
    if (this.rootTile.boundingVolume.region) {
      const e = [...this.rootTile.boundingVolume.region], r = e[0], n = e[2], s = e[1], a = e[3], o = (n - r) / Math.pow(2, t.implicitTilingData.level), c = (a - s) / Math.pow(2, t.implicitTilingData.level);
      e[0] = r + o * t.implicitTilingData.x, e[2] = r + o * (t.implicitTilingData.x + 1), e[1] = s + c * t.implicitTilingData.y, e[3] = s + c * (t.implicitTilingData.y + 1);
      for (let l = 0; l < 4; l++) {
        const u = e[l];
        u < -Math.PI ? e[l] += 2 * Math.PI : u > Math.PI && (e[l] -= 2 * Math.PI);
      }
      if (m(t)) {
        const l = e[4], f = (e[5] - l) / Math.pow(2, t.implicitTilingData.level);
        e[4] = l + f * t.implicitTilingData.z, e[5] = l + f * (t.implicitTilingData.z + 1);
      }
      i.region = e;
    }
    if (this.rootTile.boundingVolume.box) {
      const e = [...this.rootTile.boundingVolume.box], r = 2 ** t.implicitTilingData.level - 1, n = Math.pow(2, -t.implicitTilingData.level), s = m(t) ? 3 : 2;
      for (let a = 0; a < s; a++) {
        e[3 + a * 3 + 0] *= n, e[3 + a * 3 + 1] *= n, e[3 + a * 3 + 2] *= n;
        const o = e[3 + a * 3 + 0], c = e[3 + a * 3 + 1], l = e[3 + a * 3 + 2], u = a === 0 ? t.implicitTilingData.x : a === 1 ? t.implicitTilingData.y : t.implicitTilingData.z;
        e[0] += 2 * o * (-0.5 * r + u), e[1] += 2 * c * (-0.5 * r + u), e[2] += 2 * l * (-0.5 * r + u);
      }
      i.box = e;
    }
    return i;
  }
  /**
   * Each child’s geometricError is half of its parent’s geometricError.
   * @param {Object | SubtreeTile} tile
   * @returns {number}
   */
  getGeometricError(t) {
    return this.rootTile.geometricError / Math.pow(2, t.implicitTilingData.level);
  }
  /**
   * Determine what child subtrees exist and return a list of information.
   *
   * @param {Object} subtree The subtree for looking up availability.
   * @param {Array} bottomRow The bottom row of tiles in a transcoded subtree.
   * @returns {Array} A list of identifiers for the child subtrees.
   * @private
   */
  listChildSubtrees(t, i) {
    const e = [], r = w(this.rootTile);
    for (let n = 0; n < i.length; n++) {
      const s = i[n];
      if (s !== void 0)
        for (let a = 0; a < r; a++) {
          const o = n * r + a;
          this.getBit(t._childSubtreeAvailability, o) && e.push({
            tile: s,
            childMortonIndex: o
          });
        }
    }
    return e;
  }
  /**
   * Replaces placeholder tokens in a URI template with the corresponding tile properties.
   *
   * The URI template should contain the tokens:
   * - `{level}` for the tile's subdivision level.
   * - `{x}` for the tile's x-coordinate.
   * - `{y}` for the tile's y-coordinate.
   * - `{z}` for the tile's z-coordinate.
   *
   * @param {Object} tile - The tile object containing properties __level, __x, __y, and __z.
   * @param {string} uri - The URI template string with placeholders.
   * @returns {string} The URI with placeholders replaced by the tile's properties.
   */
  parseImplicitURI(t, i) {
    return i = i.replace("{level}", t.implicitTilingData.level), i = i.replace("{x}", t.implicitTilingData.x), i = i.replace("{y}", t.implicitTilingData.y), i = i.replace("{z}", t.implicitTilingData.z), i;
  }
  /**
   * Generates the full external buffer URI for a tile by combining an implicit URI with a buffer URI.
   *
   * First, it parses the implicit URI using the tile properties and the provided template. Then, it creates a new URL
   * relative to the tile's base path, removes the last path segment, and appends the buffer URI.
   *
   * @param {Object} tile - The tile object that contains properties:
   *   - __level: the subdivision level,
   *   - __x, __y, __z: the tile coordinates,
   * @param {string} uri - The URI template string with placeholders for the tile (e.g., `{level}`, `{x}`, `{y}`, `{z}`).
   * @param {string} bufUri - The buffer file name to append (e.g., "0_1.bin").
   * @returns {string} The full external buffer URI.
   */
  parseImplicitURIBuffer(t, i, e) {
    const r = this.parseImplicitURI(t, i), n = new URL(r, this.workingPath + "/");
    return n.pathname = n.pathname.substring(0, n.pathname.lastIndexOf("/")), new URL(n.pathname + "/" + e, this.workingPath + "/").toString();
  }
}
class $ {
  constructor() {
    this.name = "IMPLICIT_TILING_PLUGIN";
  }
  init(t) {
    this.tiles = t;
  }
  preprocessNode(t, i, e) {
    var r;
    t.implicitTiling ? (t.internal.hasUnrenderableContent = !0, t.internal.hasRenderableContent = !1, t.implicitTilingData = {
      // Keep this tile as an Implicit Root Tile
      root: t,
      // Idx of the tile in its subtree
      subtreeIdx: 0,
      // Coords of the tile
      x: 0,
      y: 0,
      z: 0,
      level: 0
    }) : /.subtree$/i.test((r = t.content) == null ? void 0 : r.uri) && (t.internal.hasUnrenderableContent = !0, t.internal.hasRenderableContent = !1);
  }
  parseTile(t, i, e) {
    if (/^subtree$/i.test(e)) {
      const r = new B(i);
      return r.workingPath = i.internal.basePath, r.fetchOptions = this.tiles.fetchOptions, r.parse(t);
    }
  }
  preprocessURL(t, i) {
    if (i && i.implicitTiling) {
      const e = i.implicitTiling.subtrees.uri.replace("{level}", i.implicitTilingData.level).replace("{x}", i.implicitTilingData.x).replace("{y}", i.implicitTilingData.y).replace("{z}", i.implicitTilingData.z);
      return new URL(e, i.internal.basePath + "/").toString();
    }
    return t;
  }
  disposeTile(t) {
    var i;
    /.subtree$/i.test((i = t.content) == null ? void 0 : i.uri) && (t.children.forEach((e) => {
      this.tiles.processNodeQueue.remove(e);
    }), t.children.length = 0);
  }
}
class C {
  constructor() {
    this.name = "ENFORCE_NONZERO_ERROR", this.priority = -1 / 0, this.originalError = /* @__PURE__ */ new Map();
  }
  preprocessNode(t) {
    if (t.geometricError === 0) {
      let i = t.parent, e = 1;
      for (; i !== null; ) {
        if (i.geometricError !== 0) {
          t.geometricError = i.geometricError * 2 ** -e;
          break;
        }
        i = i.parent, e++;
      }
    }
  }
}
const x = 101010256, D = 33639248, S = 67324752, U = 65557, _ = 1024;
class I {
  constructor(t, i = fetch, e = {}) {
    this.url = t, this.fetchFn = i, this.fetchOptions = e, this.entries = /* @__PURE__ */ new Map(), this._ready = null;
  }
  ready(t) {
    return this._ready === null && (this._ready = this._initialize(t)), this._ready;
  }
  async _initialize(t) {
    const i = await this._fetchSize(t);
    if (i === null)
      throw new Error(`ZipArchiveReader: Could not determine size of "${this.url}".`);
    const e = Math.min(U, i), r = i - e, n = await this._fetchRange(r, i - 1, t), s = new DataView(n.buffer);
    let a = -1;
    for (let f = s.byteLength - 22; f >= 0; f--)
      if (s.getUint32(f, !0) === x) {
        a = f;
        break;
      }
    if (a < 0)
      throw new Error(`ZipArchiveReader: Could not find End of Central Directory in "${this.url}".`);
    const o = s.getUint32(a + 12, !0), c = s.getUint32(a + 16, !0), l = s.getUint16(a + 10, !0);
    if (c === 4294967295 || o === 4294967295 || l === 65535)
      throw new Error(`ZipArchiveReader: ZIP64 archives are not supported ("${this.url}").`);
    let u;
    if (c >= r) {
      const f = c - r;
      u = n.buffer.slice(f, f + o);
    } else
      u = (await this._fetchRange(c, c + o - 1, t)).buffer;
    this._parseCentralDirectory(u, l);
  }
  _parseCentralDirectory(t, i) {
    const e = new DataView(t), r = new TextDecoder("utf-8");
    let n = 0, s = 0;
    for (; n + 46 <= t.byteLength && e.getUint32(n, !0) === D; ) {
      const a = e.getUint16(n + 8, !0), o = e.getUint16(n + 10, !0), c = e.getUint32(n + 20, !0), l = e.getUint32(n + 24, !0), u = e.getUint16(n + 28, !0), f = e.getUint16(n + 30, !0), p = e.getUint16(n + 32, !0), d = e.getUint32(n + 42, !0);
      if (c === 4294967295 || l === 4294967295 || d === 4294967295)
        throw new Error(`ZipArchiveReader: ZIP64 entries are not supported ("${this.url}").`);
      const g = new Uint8Array(t, n + 46, u), b = r.decode(g);
      b.endsWith("/") || this.entries.set(b, {
        name: b,
        method: o,
        compSize: c,
        uncompSize: l,
        nameLen: u,
        localOffset: d,
        flags: a
      }), n += 46 + u + f + p, s++;
    }
    s !== i && console.warn(`ZipArchiveReader: expected ${i} entries, parsed ${s}.`);
  }
  async getFile(t, i) {
    await this.ready(i);
    const e = this.entries.get(t);
    if (!e)
      throw new Error(`ZipArchiveReader: File "${t}" not found in archive "${this.url}".`);
    const r = 30 + e.nameLen + _, n = e.localOffset, s = n + r + e.compSize - 1, a = await this._fetchRange(n, s, i), o = new DataView(a.buffer);
    if (o.getUint32(0, !0) !== S)
      throw new Error(`ZipArchiveReader: Local file header signature mismatch for "${t}".`);
    const c = o.getUint16(26, !0), l = o.getUint16(28, !0), u = 30 + c + l;
    let f;
    if (u + e.compSize <= a.buffer.byteLength)
      f = new Uint8Array(a.buffer, u, e.compSize);
    else {
      const p = e.localOffset + u, d = p + e.compSize - 1, g = await this._fetchRange(p, d, i);
      f = new Uint8Array(g.buffer);
    }
    return await L(f, e, this.url);
  }
  async _fetchRange(t, i, e) {
    const r = { ...this.fetchOptions, ...e || {} }, n = new Headers(r.headers || {});
    n.set("Range", `bytes=${t}-${i}`);
    const s = await this.fetchFn(this.url, {
      ...r,
      headers: n
    });
    if (!s.ok)
      throw new Error(`ZipArchiveReader: Range request failed for "${this.url}" (status ${s.status}).`);
    return { buffer: await s.arrayBuffer() };
  }
  async _fetchSize(t) {
    const i = { ...this.fetchOptions, ...t || {} }, e = new Headers(i.headers || {});
    e.set("Range", "bytes=0-0");
    const r = await this.fetchFn(this.url, {
      ...i,
      method: "GET",
      headers: e
    });
    if (!r.ok)
      throw new Error(`ZipArchiveReader: Size probe failed for "${this.url}" (status ${r.status}).`);
    await r.arrayBuffer();
    const n = r.headers.get("Content-Range");
    if (n) {
      const a = n.match(/bytes\s+\d+-\d+\/(\d+)/i);
      if (a) return Number(a[1]);
    }
    const s = r.headers.get("Content-Length");
    return s ? Number(s) : null;
  }
}
async function L(h, t, i) {
  if (t.method === 0)
    return h;
  if (t.method === 8)
    return await T(h, "deflate-raw", t, i);
  if (t.method === 93)
    return await T(h, "zstd", t, i);
  throw new Error(`ZipArchiveReader: Unsupported compression method ${t.method} for "${t.name}" in "${i}".`);
}
async function T(h, t, i, e) {
  if (typeof DecompressionStream > "u")
    throw new Error(`ZipArchiveReader: DecompressionStream is unavailable — cannot decode "${t}" entry "${i.name}" in "${e}".`);
  let r;
  try {
    r = new DecompressionStream(t);
  } catch (a) {
    throw new Error(`ZipArchiveReader: This runtime does not support DecompressionStream("${t}") — cannot decode "${i.name}" in "${e}". Upgrade to a newer browser or Node version that implements the format.`, { cause: a });
  }
  const n = new Blob([h]).stream().pipeThrough(r), s = await new Response(n).arrayBuffer();
  return new Uint8Array(s);
}
const y = /^(.+?\.3tz)\/([^?#]+)(\?[^#]*)?(#.*)?$/i, z = /^(.+?\.3tz)(\?[^#]*)?(#.*)?$/i;
class O {
  constructor(t = {}) {
    this.name = "TZ3_PLUGIN", this.priority = -100, this.tiles = null, this.fetchOptions = t.fetchOptions || null, this._archives = /* @__PURE__ */ new Map();
  }
  init(t) {
    this.tiles = t;
  }
  preprocessURL(t, i) {
    if (i !== null) return t;
    const e = String(t), r = e.match(z);
    if (!r || y.test(e)) return t;
    const [, n, s = "", a = ""] = r;
    return `${n}/tileset.json${s}${a}`;
  }
  fetchData(t, i) {
    const r = String(t).match(y);
    if (!r) return null;
    const [, n, s] = r;
    return this._fetchFromArchive(n, s, i);
  }
  async _fetchFromArchive(t, i, e) {
    let r = this._archives.get(t);
    if (!r) {
      const s = (a, o) => fetch(a, o);
      r = new I(t, s, this.fetchOptions || {}), this._archives.set(t, r);
    }
    const n = await r.getFile(i, e);
    return new Response(n, {
      status: 200,
      headers: { "Content-Length": String(n.byteLength) }
    });
  }
  dispose() {
    this._archives.clear();
  }
}
export {
  P as CesiumIonAuth,
  Z as CesiumIonAuthPlugin,
  C as EnforceNonZeroErrorPlugin,
  k as GoogleCloudAuth,
  H as GoogleCloudAuthPlugin,
  $ as ImplicitTilingPlugin,
  G as QuantizedMeshLoaderBase,
  O as TZ3Plugin
};
//# sourceMappingURL=index.core-plugins.js.map
