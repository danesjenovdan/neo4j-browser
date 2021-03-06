/*
 * Copyright (c) 2002-2020 "Neo4j,"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Neo4j is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React, { Component } from 'react'
import { connect } from 'react-redux'
import { deepEquals } from 'services/utils'
import * as grassActions from 'shared/modules/grass/grassDuck'
import bolt from 'services/bolt/bolt'
import { withBus } from 'react-suber'
import { ExplorerComponentWithBus } from '../../D3Visualization/components/Explorer'
import { StyledVisContainer } from './VisualizationView.styled'

import { CYPHER_REQUEST } from 'shared/modules/cypher/cypherDuck'
import { NEO4J_BROWSER_USER_ACTION_QUERY } from 'services/bolt/txMetadata'

export class Visualization extends Component {
  state = {
    nodes: [],
    relationships: []
  }

  componentDidMount() {
    const { records = [] } = this.props.result
    if (records && records.length > 0) {
      this.populateDataToStateFromProps(this.props)
    }
  }

  shouldComponentUpdate(props, state) {
    return (
      this.props.updated !== props.updated ||
      !deepEquals(props.graphStyleData, this.props.graphStyleData) ||
      this.state.updated !== state.updated ||
      this.props.frameHeight !== props.frameHeight ||
      this.props.autoComplete !== props.autoComplete
    )
  }

  componentWillReceiveProps(props) {
    if (
      this.props.updated !== props.updated ||
      this.props.autoComplete !== props.autoComplete
    ) {
      this.populateDataToStateFromProps(props)
    }
  }

  populateDataToStateFromProps(props) {
    const {
      nodes,
      relationships
    } = bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
      props.result.records
    )
    this.setState({
      nodes,
      relationships,
      updated: new Date().getTime()
    })
  }

  autoCompleteRelationships(existingNodes, newNodes) {
    if (this.props.autoComplete) {
      const existingNodeIds = existingNodes.map(node => parseInt(node.id))
      const newNodeIds = newNodes.map(node => parseInt(node.id))

      this.getInternalRelationships(existingNodeIds, newNodeIds)
        .then(graph => {
          this.autoCompleteCallback &&
            this.autoCompleteCallback(graph.relationships)
        })
        .catch(e => {})
    } else {
      this.autoCompleteCallback && this.autoCompleteCallback([])
    }
  }

  getNeighbours(id, currentNeighbourIds = []) {
    const query = `MATCH path = (a)--(o)
                   WHERE id(a) = ${id}
                   AND NOT (id(o) IN[${currentNeighbourIds.join(',')}])
                   RETURN path, size((a)--()) as c
                   ORDER BY id(o)
                   LIMIT ${this.props.maxNeighbours -
                     currentNeighbourIds.length}`
    return new Promise((resolve, reject) => {
      this.props.bus &&
        this.props.bus.self(
          CYPHER_REQUEST,
          { query: query, queryType: NEO4J_BROWSER_USER_ACTION_QUERY },
          response => {
            if (!response.success) {
              reject(new Error())
            } else {
              const count =
                response.result.records.length > 0
                  ? parseInt(response.result.records[0].get('c').toString())
                  : 0
              const resultGraph = bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
                response.result.records,
                false
              )
              this.autoCompleteRelationships(
                this.graph._nodes,
                resultGraph.nodes
              )
              resolve({ ...resultGraph, count: count })
            }
          }
        )
    })
  }

  deleteItem(item) {
    let query = ''

    if (item.type === 'node') {
      query = `MATCH (node)
               WHERE id(node) = ${item.item.id}
               OPTIONAL MATCH (node)-[rel]-()
               DELETE node, rel`
    } else {
      query = `MATCH ()-[rel]-()
               WHERE id(rel) = ${item.item.id}
               DELETE rel`
    }

    return new Promise((resolve, reject) => {
      this.props.bus &&
        this.props.bus.self(CYPHER_REQUEST, { query: query }, response => {
          if (!response.success) {
            reject(new Error())
          } else {
            resolve(item)
          }
        })
    })
  }

  addItem() {
    const query = `CREATE (n:Unlabeled)
                   RETURN n`

    return new Promise((resolve, reject) => {
      this.props.bus &&
        this.props.bus.self(CYPHER_REQUEST, { query: query }, response => {
          if (!response.success) {
            reject(new Error())
          } else {
            const resultGraph = bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
              response.result.records,
              false
            )
            this.autoCompleteRelationships(this.graph._nodes, resultGraph.nodes)
            resolve({ ...resultGraph, count: 1 })
          }
        })
    })
  }

  setItemProperty(item, key, value) {
    let query = ''

    if (item.type === 'node') {
      query = `MATCH (node)
               WHERE id(node) = ${item.item.id}
               SET node.\`${key}\` = "${value}"
               RETURN node`
    } else {
      query = `MATCH ()-[rel]-()
               WHERE id(rel) = ${item.item.id}
               SET rel.\`${key}\` = "${value}"
               RETURN rel`
    }

    return new Promise((resolve, reject) => {
      this.props.bus &&
        this.props.bus.self(CYPHER_REQUEST, { query: query }, response => {
          if (!response.success) {
            reject(new Error())
          } else {
            const resultGraph = bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
              response.result.records,
              false
            )
            this.autoCompleteRelationships(this.graph._nodes, resultGraph.nodes)
            resolve({ ...resultGraph, count: 1 })
          }
        })
    })
  }

  removeItemProperty(item, key) {
    let query = ''

    if (item.type === 'node') {
      query = `MATCH (node)
               WHERE id(node) = ${item.item.id}
               REMOVE node.\`${key}\`
               RETURN node`
    } else {
      query = `MATCH ()-[rel]-()
               WHERE id(rel) = ${item.item.id}
               REMOVE rel.\`${key}\`
               RETURN rel`
    }

    return new Promise((resolve, reject) => {
      this.props.bus &&
        this.props.bus.self(CYPHER_REQUEST, { query: query }, response => {
          if (!response.success) {
            reject(new Error())
          } else {
            const resultGraph = bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
              response.result.records,
              false
            )
            this.autoCompleteRelationships(this.graph._nodes, resultGraph.nodes)
            resolve({ ...resultGraph, count: 1 })
          }
        })
    })
  }

  setRelationshipType(item, type) {
    // first we need to query and save the old relationship
    // since neo4j can't return it once it's been deleted

    const query_old = `MATCH (n)-[old]->(m)
                       WHERE ID(old) = ${item.item.id}
                       RETURN old`
    let oldRel
    this.props.bus.self(CYPHER_REQUEST, { query: query_old }, response => {
      if (!response.success) {
        console.log('OLD RELATIONSHIP QUERY ERROR!')
        console.log(response)
      } else {
        const resultGraph = bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
          response.result.records,
          false
        )
        oldRel = resultGraph.relationships[0]
      }
    })

    // here we create the new relationship, delete the
    // old, and return the new one
    const query = `MATCH (n)-[old]->(m)
                   WHERE id(old) = ${item.item.id}
                   CREATE (n)-[new:${type}]->(m)
                   SET new = old
                   WITH new, old, ID(old) AS oldId
                   DELETE old
                   RETURN new`
    //  RETURN new, oldId`

    return new Promise((resolve, reject) => {
      this.props.bus &&
        this.props.bus.self(CYPHER_REQUEST, { query: query }, response => {
          if (!response.success) {
            reject(new Error())
          } else {
            const resultGraph = bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
              response.result.records,
              false
            )
            // add the old relationship to our resultGraph
            resultGraph.relationships.push(oldRel)
            this.autoCompleteRelationships(this.graph._nodes, resultGraph.nodes)
            resolve({ ...resultGraph, count: 1 })
          }
        })
    })
  }

  addNodeLabel(item, label) {
    const query = `MATCH (node)
                   WHERE id(node) = ${item.item.id}
                   SET node:\`${label}\`
                   RETURN node`

    return new Promise((resolve, reject) => {
      this.props.bus &&
        this.props.bus.self(CYPHER_REQUEST, { query: query }, response => {
          if (!response.success) {
            reject(new Error())
          } else {
            const resultGraph = bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
              response.result.records,
              false
            )
            this.autoCompleteRelationships(this.graph._nodes, resultGraph.nodes)
            resolve({ ...resultGraph, count: 1 })
          }
        })
    })
  }

  removeNodeLabel(item, label) {
    const query = `MATCH (node)
                   WHERE id(node) = ${item.item.id}
                   REMOVE node:\`${label}\`
                   RETURN node`

    return new Promise((resolve, reject) => {
      this.props.bus &&
        this.props.bus.self(CYPHER_REQUEST, { query: query }, response => {
          if (!response.success) {
            reject(new Error())
          } else {
            const resultGraph = bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
              response.result.records,
              false
            )
            this.autoCompleteRelationships(this.graph._nodes, resultGraph.nodes)
            resolve({ ...resultGraph, count: 1 })
          }
        })
    })
  }

  connectItems(source, target) {
    const query = `MATCH (source)
                   MATCH (target)
                   WHERE id(source) = ${source.item.id} AND id(target) = ${target.item.id}
                   CREATE (source)-[rel:untyped]->(target)
                   RETURN source, rel, target`

    return new Promise((resolve, reject) => {
      this.props.bus &&
        this.props.bus.self(CYPHER_REQUEST, { query: query }, response => {
          if (!response.success) {
            reject(new Error())
          } else {
            const resultGraph = bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
              response.result.records,
              false
            )
            this.autoCompleteRelationships(this.graph._nodes, resultGraph.nodes)
            resolve({ ...resultGraph, count: 1 })
          }
        })
    })
  }

  getInternalRelationships(existingNodeIds, newNodeIds) {
    newNodeIds = newNodeIds.map(bolt.neo4j.int)
    existingNodeIds = existingNodeIds.map(bolt.neo4j.int)
    existingNodeIds = existingNodeIds.concat(newNodeIds)
    const query =
      'MATCH (a)-[r]->(b) WHERE id(a) IN $existingNodeIds AND id(b) IN $newNodeIds RETURN r;'
    return new Promise((resolve, reject) => {
      this.props.bus &&
        this.props.bus.self(
          CYPHER_REQUEST,
          {
            query,
            params: { existingNodeIds, newNodeIds },
            queryType: NEO4J_BROWSER_USER_ACTION_QUERY
          },
          response => {
            if (!response.success) {
              reject(new Error())
            } else {
              resolve({
                ...bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
                  response.result.records,
                  false
                )
              })
            }
          }
        )
    })
  }

  setGraph(graph) {
    this.graph = graph
    this.autoCompleteRelationships([], this.graph._nodes)
  }

  render() {
    if (!this.state.nodes.length) return null

    return (
      <StyledVisContainer fullscreen={this.props.fullscreen}>
        <ExplorerComponentWithBus
          maxNeighbours={this.props.maxNeighbours}
          initialNodeDisplay={this.props.initialNodeDisplay}
          graphStyleData={this.props.graphStyleData}
          updateStyle={this.props.updateStyle}
          getNeighbours={this.getNeighbours.bind(this)}
          deleteItem={this.deleteItem.bind(this)}
          addItem={this.addItem.bind(this)}
          setItemProperty={this.setItemProperty.bind(this)}
          removeItemProperty={this.removeItemProperty.bind(this)}
          setRelationshipType={this.setRelationshipType.bind(this)}
          addNodeLabel={this.addNodeLabel.bind(this)}
          removeNodeLabel={this.removeNodeLabel.bind(this)}
          connectItems={this.connectItems.bind(this)}
          nodes={this.state.nodes}
          relationships={this.state.relationships}
          fullscreen={this.props.fullscreen}
          frameHeight={this.props.frameHeight}
          assignVisElement={this.props.assignVisElement}
          getAutoCompleteCallback={callback => {
            this.autoCompleteCallback = callback
          }}
          setGraph={this.setGraph.bind(this)}
        />
      </StyledVisContainer>
    )
  }
}

const mapStateToProps = state => {
  return {
    graphStyleData: grassActions.getGraphStyleData(state)
  }
}

const mapDispatchToProps = dispatch => {
  return {
    updateStyle: graphStyleData => {
      dispatch(grassActions.updateGraphStyleData(graphStyleData))
    }
  }
}

export const VisualizationConnectedBus = withBus(
  connect(mapStateToProps, mapDispatchToProps)(Visualization)
)
