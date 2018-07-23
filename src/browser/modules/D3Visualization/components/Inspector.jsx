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
import { deepEquals, optionalToString } from 'services/utils'
import SVGInline from 'react-svg-inline'
import {
  inspectorFooterContractedHeight,
  StyledInspectorFooterStatusMessage,
  StyledTokenContextMenuKey,
  StyledTokenRelationshipType,
  StyledLabelToken,
  StyledStatusBar,
  StyledStatus,
  StyledInspectorFooter,
  StyledInspectorFooterRow,
  StyledInspectorFooterRowListPair,
  StyledInspectorFooterRowListKey,
  StyledInspectorFooterRowListValue,
  StyledInlineList
} from './styled'
import { GrassEditor } from './GrassEditor'
import { RowExpandToggleComponent } from './RowExpandToggle'
import { AddItemIcon, PlusIcon } from 'src-root/browser/components/icons/Icons'
import ClickableUrls from '../../../components/clickable-urls'
import numberToUSLocale from 'shared/utils/number-to-US-locale'

const mapItemProperties = (itemProperties, onEditProperty, onRemoveProperty) =>
  itemProperties
    .sort(({ key: keyA }, { key: keyB }) =>
      keyA < keyB ? -1 : keyA === keyB ? 0 : 1
    )
    .map((prop, i) => (
      <StyledInspectorFooterRowListPair className='pair' key={'prop' + i}>
        <StyledInspectorFooterRowListKey
          className='key'
          title={'Click to remove ' + prop.key}
          style={{ cursor: 'not-allowed' }}
          onClick={() => onRemoveProperty(prop.key)}
        >
          {prop.key + ': '}
        </StyledInspectorFooterRowListKey>
        <StyledInspectorFooterRowListValue
          className='value'
          title={'Click to edit ' + prop.key}
          onClick={() => onEditProperty(prop.key, prop.value)}
        >
          {optionalToString(prop.value)}
        </StyledInspectorFooterRowListValue>
      </StyledInspectorFooterRowListPair>
    ))

const mapLabels = (graphStyle, itemLabels) => {
  return itemLabels.map((label, i) => {
    const graphStyleForLabel = graphStyle.forNode({ labels: [label] })
    const style = {
      backgroundColor: graphStyleForLabel.get('color'),
      color: graphStyleForLabel.get('text-color-internal'),
      cursor: 'not-allowed'
    }
    return (
      <StyledLabelToken
        key={'label' + i}
        style={style}
        className={'token' + ' ' + 'token-label'}
        title={'Click to remove label ' + label}
      >
        {label}
      </StyledLabelToken>
    )
  })
}

export class InspectorComponent extends Component {
  constructor(props) {
    super(props)
    this.state = {
      contracted: true,
      graphStyle: props.graphStyle
    }
  }

  setFooterRowELem(elem) {
    if (elem) {
      this.footerRowElem = elem
    }
  }

  render() {
    let item
    let type
    let inspectorContent

    if (this.props.hoveredItem && this.props.hoveredItem.type !== 'canvas') {
      item = this.props.hoveredItem.item
      type = this.props.hoveredItem.type
    } else if (this.props.selectedItem) {
      item = this.props.selectedItem.item
      type = this.props.selectedItem.type
    } else if (this.props.hoveredItem) {
      // Canvas
      item = this.props.hoveredItem.item
      type = this.props.hoveredItem.type
    }
    if (item && type) {
      if (type === 'legend-item') {
        inspectorContent = (
          <GrassEditor
            selectedLabel={item.selectedLabel}
            selectedRelType={item.selectedRelType}
          />
        )
      }
      if (type === 'status-item') {
        inspectorContent = (
          <StyledInspectorFooterStatusMessage className="value">
            {item}
          </StyledInspectorFooterStatusMessage>
        )
      }
      if (type === 'context-menu-item') {
        inspectorContent = (
          <StyledInlineList className="list-inline">
            <StyledTokenContextMenuKey
              key="token"
              className={
                'token' + ' ' + 'token-context-menu-key' + ' ' + 'token-label'
              }
            >
              <SVGInline svg={item.label} width="12px" />
            </StyledTokenContextMenuKey>
            <StyledInspectorFooterRowListPair key="pair" className="pair">
              <StyledInspectorFooterRowListValue className="value">
                {item.content}
              </StyledInspectorFooterRowListValue>
            </StyledInspectorFooterRowListPair>
          </StyledInlineList>
        )
      } else if (type === 'canvas') {
        const description = `Displaying ${numberToUSLocale(
          item.nodeCount
        )} nodes, ${numberToUSLocale(item.relationshipCount)} relationships.`
        inspectorContent = (
          <StyledInlineList className="list-inline">
            <StyledInspectorFooterRowListPair className="pair" key="pair">
              <StyledInspectorFooterRowListValue className="value">
                {description}
              </StyledInspectorFooterRowListValue>
            </StyledInspectorFooterRowListPair>
          </StyledInlineList>
        )
      } else if (type === 'node') {
        inspectorContent = (
          <StyledInlineList className="list-inline">
            {mapLabels(this.state.graphStyle, item.labels)}
            <StyledLabelToken
              className={'token token-label'}
              title={'Click to add label'}
              style={{ verticalAlign: 'middle' }}
            >
              <AddItemIcon />
            </StyledLabelToken>
            <StyledInspectorFooterRowListPair key='pair' className='pair'>
              <StyledInspectorFooterRowListKey className='key'>
                {'<id>:'}
              </StyledInspectorFooterRowListKey>
              <StyledInspectorFooterRowListValue className="value">
                {item.id}
              </StyledInspectorFooterRowListValue>
            </StyledInspectorFooterRowListPair>
            {mapItemProperties(
              item.properties,
              this.props.onEditProperty,
              this.props.onRemoveProperty
            )}
            <StyledLabelToken
              className={'token token-label'}
              title={'Click to add property'}
              style={{ verticalAlign: 'middle' }}
              onClick={this.props.onAddProperty}
            >
              <AddItemIcon />
            </StyledLabelToken>
          </StyledInlineList>
        )
      } else if (type === 'relationship') {
        const style = {
          backgroundColor: this.state.graphStyle
            .forRelationship(item)
            .get('color'),
          color: this.state.graphStyle
            .forRelationship(item)
            .get('text-color-internal'),
          cursor: 'text'
        }
        inspectorContent = (
          <StyledInlineList className="list-inline">
            <StyledTokenRelationshipType
              key="token"
              style={style}
              className={'token' + ' ' + 'token-relationship-type'}
              title={'Click to change type'}
              onClick={() => this.props.onEditRelationshipType(item.type)}
            >
              {item.type}
            </StyledTokenRelationshipType>
            <StyledInspectorFooterRowListPair key="pair" className="pair">
              <StyledInspectorFooterRowListKey className="key">
                {'<id>:'}
              </StyledInspectorFooterRowListKey>
              <StyledInspectorFooterRowListValue className="value">
                {item.id}
              </StyledInspectorFooterRowListValue>
            </StyledInspectorFooterRowListPair>
            {mapItemProperties(
              item.properties,
              this.props.onEditProperty,
              this.props.onRemoveProperty
            )}
            <StyledLabelToken
              className={'token token-label'}
              title={'Click to add a new property'}
              style={{ verticalAlign: 'middle' }}
              onClick={this.props.onAddProperty}
            >
              <AddItemIcon />
            </StyledLabelToken>
          </StyledInlineList>
        )
      }
    }

    return (
      <StyledStatusBar
        fullscreen={this.props.fullscreen}
        className="status-bar"
      >
        <StyledStatus className="status">
          <StyledInspectorFooter
            className={
              this.state.contracted
                ? 'contracted inspector-footer'
                : 'inspector-footer'
            }
          >
            <StyledInspectorFooterRow
              data-testid="vizInspector"
              className="inspector-footer-row"
              ref={this.setFooterRowELem.bind(this)}
            >
              {type === 'canvas' ? null : (
                <RowExpandToggleComponent
                  contracted={this.state.contracted}
                  rowElem={this.footerRowElem}
                  containerHeight={inspectorFooterContractedHeight}
                  onClick={this.toggleExpand.bind(this)}
                />
              )}
              {inspectorContent}
            </StyledInspectorFooterRow>
          </StyledInspectorFooter>
        </StyledStatus>
      </StyledStatusBar>
    )
  }

  toggleExpand() {
    this.setState({ contracted: !this.state.contracted }, () => {
      const inspectorHeight = this.footerRowElem.clientHeight
      this.props.onExpandToggled &&
        this.props.onExpandToggled(
          this.state.contracted,
          this.state.contracted ? 0 : inspectorHeight
        )
    })
  }

  componentWillReceiveProps(nextProps) {
    if (!deepEquals(this.props.selectedItem, nextProps.selectedItem)) {
      this.setState({ contracted: true })
      this.props.onExpandToggled && this.props.onExpandToggled(true, 0)
    }
  }
}
