import React from "react";
import { connect } from "react-redux";
import Highcharts, { chart } from "highcharts";
import HighchartsReact from "highcharts-react-official";
import PieChart from "highcharts-react-official";
import Main from "./Main";
import axios from 'axios';
import '../../../styles/main.css'

class Chart extends React.Component {
  constructor(props) {
    super(props);
    /* this.state = {
      chartData: props.chartData,
      chartDataPie: props.chartDataPie
    }; */
    this.state = {
      sideBarNameItem: [],
      chartDataBar: {},
      chart1data: [],
      chart2data:[],
      chartDataPie: {},
      isLoaded : 'false'
    };
  }

 /* componentWillMount() {
    this.props.addBarChart();
    this.props.addPieChart();
  }*/
  componentWillMount(){
    let keys = ["name" ,"y"];
    let namesPie = []
    let itemsPie = []
    let gdata = []
    let bdata =[]
    let namesBar= []
    let priceBar=[]

    /******************PIE CHART DATA FETCHING****************/
 

     axios.get(`http://localhost:5000/xorai_analytics/factura/productsales`)
     .then(res => {
       const prodSales = JSON.parse(res.data);
       for(var i = 0 ;  i < prodSales.data.length ; i++){
         namesPie.push(prodSales.data[i]["ProductName"]);
         itemsPie.push(prodSales.data[i]["Quantity Sold"]);
       }
       console.log(priceBar)
       for( i = 0 ; i < namesPie.length ; i++){
         let obj = {}
           obj[keys[0]] = namesPie[i];
           obj[keys[1]] = itemsPie[i];
         gdata.push(obj);
         }
     this.setState({ chart1data : gdata});
     this.setState({isLoaded : 'true'});
     this.setState({
             chartDataPie: { 
               title: {
               text: 'Product Sales'
             },
             chart: {
               type: "pie"
             },
             series: [
               {
                 data:this.state.chart1data
               }
             ]
           }
        });

     /******************BAR CHART DATA FETCHING****************/

      
               axios.get(`http://localhost:5000/xorai_analytics/factura/topcust`)
               .then(res => {
                 const topcust = JSON.parse(res.data);
                 for(var i = 0 ;  i < topcust.data.length ; i++){
                   namesBar.push(topcust.data[i]["Customer"]);
                   priceBar.push(topcust.data[i]["Purchased Items"]);
                 }
                 for( i = 0 ; i < namesBar.length ; i++){
                   let obj1 = {}
                     obj1[keys[0]] = namesBar[i];
                     obj1[keys[1]] = priceBar[i];
                    bdata.push(obj1);
                 
                 }
               this.setState({ chart2data : bdata});
                       this.setState({
                         chartDataBar: {
                             chart: {
                               type: "column"
                             },
                             title: {
                               text: "Top 5 customers"
                             },
                             /* subtitle: {
                               text: "Source: WorldClimate.com"
                             }, */
                             xAxis: {
                               categories: namesBar,
                               crosshair: true
                             },
                             yAxis: {
                               min: 0,
                               title: {
                                 text: "Sale"
                               }
                             },
                             tooltip: {
                               headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
                               pointFormat:
                                 '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                                 '<td style="padding:0"><b>{point.y:.1f} mm</b></td></tr>',
                               footerFormat: "</table>",
                               shared: true,
                               useHTML: true
                             },
                             plotOptions: {
                               column: {
                                 pointPadding: 0.2,
                                 borderWidth: 0
                               }
                             },
                             series: [
                               {
                               data:this.state.chart2data,
                               }
                             ]
                           }

                       });
             
           })
   })
     
}

/************end of data fetching**********/

  render() {
    return (
      <div>
        <Main 
        chartDataPie = {this.state.chartDataPie}
        chartDataBar = {this.state.chartDataBar} 
        />   
      </div>
    )
  }
}

export default Chart