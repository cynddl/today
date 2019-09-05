// Boostrap for BootstrapTable
import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table";
import "react-bootstrap-table/dist/react-bootstrap-table-all.min.css";
import "bootstrap/dist/css/bootstrap.min.css";

import { Label, Popup } from "semantic-ui-react";
import "semantic-ui-css/semantic.min.css";


import TimeAgo from "react-timeago";
import React, {Component} from 'react'

import {dateSort, labelsSort} from "./utils";


export class DataRenderer extends Component {
    constructor(props) {
        super(props);
    }

    labelsFormatter(labels) {
        const content = labels.map(l => (
            <Popup key={l.id} trigger={<Label circular empty color={l.color == "sky" ? "blue" : l.color} key={l.color} />} content={l.name} />
        ));
        return <div>{content}</div>
    }

    dueFormater(due) {
        return (due === null) ? <p /> : <TimeAgo date={due} />
    }

    boardFormatter(board, row) {
        return <a href={`https://trello.com/b/${row.idBoard}`}>{board}</a>
    }

    nameFormater(name, row) {
        return <strong>
            <a href={row.url} className={row.dueComplete ? "card__done" : ""} target="_blank" rel="noopener noreferrer">
                {name}
            </a>
        </strong>
    }

    render () {
        let cards = this.props.cards;

        return (
            <BootstrapTable data={cards} striped={false} hover={true} bordered={false} multiColumnSort={2}>
                <TableHeaderColumn autoValue={true} dataField="id" isKey={true} hidden={true}>
                    Id
                </TableHeaderColumn>
                <TableHeaderColumn
                    width="10%"
                    dataField="labels"
                    dataFormat={this.labelsFormatter}
                    dataSort={true}
                    sortFunc={labelsSort}>
                    {" "}
                    Labels
                </TableHeaderColumn>
                <TableHeaderColumn dataField="board" dataSort={true}>
                    Board
                </TableHeaderColumn>
                <TableHeaderColumn dataField="due" dataSort={true} sortFunc={dateSort} dataFormat={this.dueFormater}>
                    Due date
                </TableHeaderColumn>
                <TableHeaderColumn dataSort={true} dataField="users">
                    Users
                </TableHeaderColumn>
                <TableHeaderColumn width="60%" dataFormat={this.nameFormater} dataField="name">
                    Card
                </TableHeaderColumn>
            </BootstrapTable>
        )
    }
}