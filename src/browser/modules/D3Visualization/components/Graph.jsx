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
import { deepEquals } from 'services/utils'
import {
  createGraph,
  getGraphStats,
  mapNodes,
  mapRelationships
} from '../mapper'
import { GraphEventHandler } from '../GraphEventHandler'
import '../lib/visualization/index'
import { dim } from 'browser-styles/constants'
import {
  StyledEditButton,
  StyledEditHolder,
  StyledSvgWrapper,
  StyledZoomButton,
  StyledZoomHolder
} from './styled'
import {
  AddItemIcon,
  EditItemIcon,
  TrashItemIcon,
  ZoomInIcon,
  ZoomOutIcon
} from 'browser-components/icons/Icons'
import graphView from '../lib/visualization/components/graphView'

export class GraphComponent extends Component {
  state = {
    zoomInLimitReached: true,
    zoomOutLimitReached: false,
    shouldResize: false
  }

  graphInit(el) {
    this.svgElement = el
  }

  zoomInClicked(el) {
    const limits = this.graphView.zoomIn(el)
    this.setState({
      zoomInLimitReached: limits.zoomInLimit,
      zoomOutLimitReached: limits.zoomOutLimit
    })
  }

  zoomOutClicked(el) {
    const limits = this.graphView.zoomOut(el)
    this.setState({
      zoomInLimitReached: limits.zoomInLimit,
      zoomOutLimitReached: limits.zoomOutLimit
    })
  }

  trashItemClicked (el) {
    const item = this.props.selectedItem
    this.props.deleteItem(item)
    this.graphEH.nodeClose(item)
  }

  editItemClicked (el) {
    const item = this.props.selectedItem
    console.log('TODO: Edit ', item)
  }

  addItemClicked (el) {
    this.props.addItem({
      type: 'node'
    })
  }

  getVisualAreaHeight () {
    return this.props.frameHeight && this.props.fullscreen
      ? this.props.frameHeight -
          (dim.frameStatusbarHeight + dim.frameTitlebarHeight * 2)
      : this.props.frameHeight - dim.frameStatusbarHeight ||
          this.svgElement.parentNode.offsetHeight
  }

  componentDidMount() {
    if (this.svgElement != null) {
      this.initGraphView()
      this.graph && this.props.setGraph && this.props.setGraph(this.graph)
      this.props.getAutoCompleteCallback &&
        this.props.getAutoCompleteCallback(this.addInternalRelationships)
      this.props.assignVisElement &&
        this.props.assignVisElement(this.svgElement, this.graphView)
    }
  }

  initGraphView() {
    if (!this.graphView) {
      const NeoConstructor = graphView
      const measureSize = () => {
        return {
          width: this.svgElement.offsetWidth,
          height: this.getVisualAreaHeight()
        }
      }
      this.graph = createGraph(this.props.nodes, this.props.relationships)
      this.graphView = new NeoConstructor(
        this.svgElement,
        measureSize,
        this.graph,
        this.props.graphStyle
      )
      this.graphEH = new GraphEventHandler(
        this.graph,
        this.graphView,
        this.props.getNodeNeighbours,
        this.props.onItemMouseOver,
        this.props.onItemSelect,
        this.props.onGraphModelChange
      )
      this.graphEH.bindEventHandlers()
      this.props.onGraphModelChange(getGraphStats(this.graph))
      this.graphView.resize()
      this.graphView.update()
    }
  }

  addInternalRelationships = internalRelationships => {
    if (this.graph) {
      this.graph.addInternalRelationships(
        mapRelationships(internalRelationships, this.graph)
      )
      this.props.onGraphModelChange(getGraphStats(this.graph))
      this.graphView.update()
      this.graphEH.onItemMouseOut()
    }
  }

  componentWillReceiveProps(props) {
    if (props.styleVersion !== this.props.styleVersion) {
      this.graphView.update()
    }
    if (
      this.props.fullscreen !== props.fullscreen ||
      this.props.frameHeight !== props.frameHeight
    ) {
      this.setState({ shouldResize: true })
    } else {
      this.setState({ shouldResize: false })
    }
  }

  componentDidUpdate() {
    if (this.state.shouldResize) {
      this.graphView.resize()
    }
  }

  zoomButtons() {
    if (this.props.fullscreen) {
      return (
        <StyledZoomHolder>
          <StyledZoomButton
            className={
              this.state.zoomInLimitReached ? 'faded zoom-in' : 'zoom-in'
            }
            onClick={this.zoomInClicked.bind(this)}
          >
            <ZoomInIcon />
          </StyledZoomButton>
          <StyledZoomButton
            className={
              this.state.zoomOutLimitReached ? 'faded zoom-out' : 'zoom-out'
            }
            onClick={this.zoomOutClicked.bind(this)}
          >
            <ZoomOutIcon />
          </StyledZoomButton>
        </StyledZoomHolder>
      )
    }
    return null
  }

  editButton () {
    const item = this.props.selectedItem
    const hasType = !!item
    const isCanvas = hasType && item['type'] === 'canvas'
    const isNode = hasType && item['type'] === 'node'
    const isRelationship = hasType && item['type'] === 'relationship'

    return (
      <StyledEditHolder>
        <StyledEditButton
          className={hasType && !isCanvas ? 'bin' : 'faded bin'}
          onClick={this.trashItemClicked.bind(this)}
        >
          <TrashItemIcon />
        </StyledEditButton>
        <StyledEditButton
          className={
            isNode || isRelationship ? 'pencil-circle' : 'faded pencil-circle'
          }
          onClick={this.editItemClicked.bind(this)}
        >
          <EditItemIcon />
        </StyledEditButton>
        <StyledEditButton
          className={!hasType || isCanvas ? 'add-circle' : 'faded add-circle'}
          onClick={this.addItemClicked.bind(this)}
        >
          <AddItemIcon />
        </StyledEditButton>
      </StyledEditHolder>
    )
  }

  render () {
    return (
      <StyledSvgWrapper>
        <svg className="neod3viz" ref={this.graphInit.bind(this)} />
        {this.zoomButtons()}
        {this.editButton()}
      </StyledSvgWrapper>
    )
  }
}
