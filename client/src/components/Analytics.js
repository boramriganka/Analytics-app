import React, { Component } from 'react';
import * as FlexmonsterReact from 'react-flexmonster';
import 'flexmonster/lib/flexmonster.highcharts.js';
import Highcharts from 'highcharts';
import 'flexmonster/flexmonster.css';

class Analytics extends Component {

    constructor(props) {
        super(props);
        this.myRef = React.createRef();
     }

    reportComplete = () => {
        this.myRef.current.flexmonster.off(this.reportComplete);
        //creating charts after Flexmonster instance is launched
        this.createChart();  
    }

    createChart = () => {
        //Running Flexmonster's getData method for Highcharts
        this.myRef.current.flexmonster.highcharts.getData(
            {
                type: "area"
              },
              function(data) {
                 Highcharts.chart('highcharts-container', data);
              },
              function(data) {
                 Highcharts.chart('highcharts-container', data);
              }
        );
    }

    

    render() {
        return (
            <div className="App">
                <h3 className="page-title">
                    ANALYTICS
                </h3>
                <FlexmonsterReact.Pivot 
                    ref={this.myRef} 
                    toolbar={true} 
                    width="100%" 
                    report="https://cdn.flexmonster.com/reports/report.json" 
                    licenseFilePath="https://cdn.flexmonster.com/jsfiddle.charts.key"
                    reportcomplete={this.reportComplete}
                />
                <div className="chart-container">
                    <div id="highcharts-container"></div>
                </div>
            </div>
        );
    }
}

export default Analytics;

