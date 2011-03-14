/**
 * The base class for nodes in a {@link Quadtree}.
 *
 */

jsts.index.quadtree.NodeBase = OpenLayers.Class();


/**
 * Initializes a node via the openlayers inheritance mechanism
 *
 * @return
 */
jsts.index.quadtree.NodeBase.prototype.initialize = function() {
  /**
   * subquads are numbered as follows:
   *
   * <pre>
   *  2 | 3
   *  --+--
   *  0 | 1
   * </pre>
   */
  this.subnode = new Array(4);
  this.subnode[0] = null;
  this.subnode[1] = null;
  this.subnode[2] = null;
  this.subnode[3] = null;

  this.items = [];
};


/**
 * Returns the index of the subquad that wholly contains the given envelope. If
 * none does, returns -1.
 */
jsts.index.quadtree.NodeBase.prototype.gutSubnodeIndex = function(env, centre) {
  var subnodeIndex = -1;
  if (env.getMinX() >= centre.x) {
    if (env.getMinY() >= centre.y) {
      subnodeIndex = 3;
    }
    if (env.getMaxY() <= centre.y) {
      subnodeIndex = 1;
    }
  }
  if (env.getMaxX() <= centre.x) {
    if (env.getMinY() >= centre.y) {
      subnodeIndex = 2;
    }
    if (env.getMaxY() <= centre.y) {
      subnodeIndex = 0;
    }
  }
  return subnodeIndex;
};


/**
 * Returns the nodes items
 *
 * @return
 */
jsts.index.quadtree.NodeBase.prototype.getItems = function() {
  return this.items;
};


/**
 * Checks if the node has any items
 *
 * @return
 */
jsts.index.quadtree.NodeBase.prototype.hasItems = function() {
  return (this.items.length > 0);
};


/**
 * Adds an item to the node
 *
 * @param item
 * @return
 */
jsts.index.quadtree.NodeBase.prototype.add = function(item) {
  this.items.push(item);
};


/**
 * Removes a single item from this subtree.
 *
 * @param searchEnv
 *          the envelope containing the item.
 * @param item
 *          the item to remove.
 * @return <code>true</code> if the item was found and removed.
 */
jsts.index.quadtree.NodeBase.prototype.remove = function(itemEnv, item) {
  // use envelope to restrict nodes scanned
  if (!this.isSearchMatch(itemEnv)) {
    return false;
  }

  var found = false, i = 0;
  for (i; i < 4; i++) {
    if (this.subnode[i] !== null) {
      found = this.subnode[i].remove(itemEnv, item);
      if (found) {
        // trim subtree if empty
        if (this.subnode[i].isPrunable()) {
          this.subnode[i] = null;
        }
        break;
      }
    }
  }
  // if item was found lower down, don't need to search for it here
  if (found) {
    return found;
  }
  // otherwise, try and remove the item from the list of items in this node

  if (OpenLayers.Util.indexOf(item) !== -1) {
    OpenLayers.Util.removeItem(this.items, item);
    found = true;
  }
  return found;
};


/**
 * @return <code>true</code> if the node is prunable.
 */
jsts.index.quadtree.NodeBase.prototype.isPrunable = function() {
  return !(this.hasChildren() || this.hasItems());
};


/**
 * @return <code>true</code> if the node has any children.
 */
jsts.index.quadtree.NodeBase.prototype.hasChildren = function() {
  var i = 0;
  for (i; i < 4; i++) {
    if (this.subnode[i] !== null) {
      return true;
    }
  }
  return false;
};


/**
 * @return <code>true</code> if the node or any subnode does not have any
 *         items.
 */
jsts.index.quadtree.NodeBase.prototype.isEmpty = function() {
  var isEmpty = true;
  if (this.items.length > 0) {
    isEmpty = false;
  }
  var i = 0;
  for (i; i < 4; i++) {
    if (this.subnode[i] !== null) {
      if (!this.subnode[i].isEmpty()) {
        isEmpty = false;
      }
    }
  }
  return isEmpty;
};


/**
 * Adds all the items of the node and any subnodes
 *
 * @param resultItems
 * @return
 */
jsts.index.quadtree.NodeBase.prototype.addAllItems = function(resultItems) {
  // this node may have items as well as subnodes (since items may not
  // be wholely contained in any single subnode
  resultItems = resultItems.concat(this.items);
  var i = 0;
  for (i; i < 4; i++) {
    if (this.subnode[i] !== null) {
      resultItems = resultItems.concat(this.subnode[i]);
    }
  }

  return resultItems;
};


/**
 *
 * @param searchEnv
 * @param resultItems
 * @return
 */
jsts.index.quadtree.NodeBase.prototype.addAllItemsFromOverlapping = function(
    searchEnv, resultItems) {
  if (!this.isSearchMatch(searchEnv)) {
    return;
  }

  // this node may have items as well as subnodes (since items may not
  // be wholely contained in any single subnode

  resultItems = resultItems.concat(this.items);

  var i = 0;
  for (i; i < 4; i++) {
    if (this.subnode[i] !== null) {
      resultItems = this.subnode[i].addAllItemsFromOverlapping(searchEnv,
          resultItems);
    }
  }
};


/**
 * Visits the node
 *
 * @param searchEnv
 * @param visitor
 * @return
 */
jsts.index.quadtree.NodeBase.prototype.visit = function(searchEnv, visitor) {
  if (!this.isSearchMatch(searchEnv)) {
    return;
  }

  // this node may have items as well as subnodes (since items may not
  // be wholely contained in any single subnode
  this.visitItems(searchEnv, visitor);

  var i = 0;
  for (i; i < 4; i++) {
    if (this.subnode[i] !== null) {
      this.subnode[i].visit(searchEnv, visitor);
    }
  }
};


/**
 * Visits the items
 *
 * @param searchEnv
 * @param visitor
 * @return
 */
jsts.index.quadtree.NodeBase.prototype.visitItems = function(searchEnv, visitor) {
  var i = 0, il = this.items.length;

  for (i; i < il; i++) {
    visitor.visitItem(this.items[i]);
  }
};


/**
 * Calculates the depth
 *
 * @return
 */
jsts.index.quadtree.NodeBase.prototype.depth = function() {
  var maxSubDepth = 0, i = 0, sqd;
  for (i; i < 4; i++) {
    if (this.subnode[i] !== null) {
      sqd = this.subnode[i].depth();
      if (sqd > maxSubDepth) {
        maxSubDepth = sqd;
      }
    }
  }
  return maxSubDepth + 1;
};


/**
 * Calculates the size
 *
 * @return
 */
jsts.index.quadtree.NodeBase.prototype.size = function() {
  var subSize = 0, i = 0;
  for (i; i < 4; i++) {
    if (this.subnode[i] !== null) {
      subSize += this.subnode[i].size();
    }
  }
  return subSize + this.items.length;
};

jsts.index.quadtree.NodeBase.prototype.getNodeCount = function() {
  var subSize = 0, i = 0;
  for (i; i < 4; i++) {
    if (this.subnode[i] !== null) {
      subSize += this.subnode[i].size();
    }
  }
  return subSize + 1;
};
