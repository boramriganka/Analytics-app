import React from "react";
import Main from "./Main";
import axios from "axios";
import "../../../styles/main.css";

class Chart extends React.Component {
  constructor(props) {
    super(props);
    /* this.state = {
      chartData: props.chartData,
      chartDataPie: props.chartDataPie
    }; */
    this.state = {
      sideBarNameItem: [],
      chartDataBar: {}, // top bar chart
      chart1data: [], // top pie chart
      chart2data: [], // top bar chart
      chartDataPie: {}, // top pie chart
      weeklychartData19: [], // weekly
      weeklychartData20: [], // weekly
      weeklychartLine: {}, // weekly
      monthlychartBar: {}, //monthly
      monthlychartData19: [], //monthly
      monthlychartData20: [], //monthly
      yearPiedata: [],
      yearPie: {},
      cloverChartDataBar: {},
      clovBarNames: [],
      clovBarQuantity: [],
      clovchart1data: [],
      cloverChartDataPie: {},
      clovpropsdata: 0,
    };
  }

  /* componentWillMount() {
    this.props.addBarChart();
    this.props.addPieChart();
  }*/
  componentDidMount() {
    let keys = ["name", "y", "sliced", "selected"];
    let keys1 = ["name", "y"];
    let namesPie = [];
    let itemsPie = [];
    let gdata = [];
    let bdata = [];
    let ydata = [];
    let namesBar = [];
    let priceBar = [];
    let clovitemsPie = [];
    let clovnamesPie = [];
    let clovvariation = [];
    let clovdata = [];
    let weekly19 = [];
    let weekly20 = [];
    let sales19 = [];
    let sales20 = [];
    let mainEndpoint = "5050";
    let analytics = ["xorai_analytics", "clover_analytics"];
    let subEndPoint = ["factura", "clover"];
    let dataFactura = [
      "productsales",
      "yearly",
      "topcust",
      "weekly",
      "monthly",
    ];
    let dataClover = ["productsales", "productsales_var"];
    /******************PIE CHART DATA FETCHING****************/

   

    /*******prodcut sales*********/

    axios
      //.get(`http://localhost:5000/xorai_analytics/factura/productsales`)
      .get(
        `http://localhost:${mainEndpoint}/${analytics[0]}/${subEndPoint[0]}/${dataFactura[0]}`
      )
      .then((res) => {
        const prodSales = JSON.parse(res.data);
        for (var i = 0; i < prodSales.data.length; i++) {
          namesPie.push(prodSales.data[i]["ProductName"]);
          itemsPie.push(prodSales.data[i]["Quantity Sold"]);
        }
        for (i = 0; i < namesPie.length; i++) {
          let obj = {};
          obj[keys[0]] = namesPie[i];
          obj[keys[1]] = itemsPie[i];
          gdata.push(obj);
        }
        this.setState({ chart1data: gdata });
        this.setState({
          chartDataPie: {
            title: {
              text: "Product Sales",
            },
            chart: {
              type: "pie",
              plotBackgroundColor: null,
              plotBorderWidth: null,
              plotShadow: false,
            },
            series: [
              {
                data: this.state.chart1data,
              },
            ],
          },
        });
        let yearName = [];
        let yearSalesPie = [];
        axios
          // .get(`http://localhost:5000/xorai_analytics/factura/yearly`)
          .get(
            `http://localhost:${mainEndpoint}/${analytics[0]}/${subEndPoint[0]}/${dataFactura[1]}`
          )
          .then((res) => {
            const yearly = JSON.parse(res.data);
            for (var i = 0; i < yearly.data.length; i++) {
              yearName.push(yearly.data[i]["year"]);
              yearSalesPie.push(yearly.data[i]["amount"]);
            }

            for (i = 0; i < yearName.length; i++) {
              let obj1 = {};
              obj1[keys[0]] = yearName[i];
              obj1[keys[1]] = yearSalesPie[i];
              ydata.push(obj1);
            }
            this.setState({ yearPiedata: ydata });
            this.setState({
              yearPie: {
                title: {
                  text: "Yearly Sales",
                },
                colors: ["#fe4a49", "#2ab7ca"],
                chart: {
                  type: "pie",
                },

                plotOptions: {
                  pie: {
                    allowPointSelect: true,
                    cursor: "pointer",
                    dataLabels: {
                      enabled: false,
                    },
                    showInLegend: true,
                  },
                },
                series: [
                  {
                    data: this.state.yearPiedata,
                  },
                ],
              },
            });
            axios
              //.get(`http://localhost:5000/xorai_analytics/factura/topcust`)
              .get(
                `http://localhost:${mainEndpoint}/${analytics[0]}/${subEndPoint[0]}/${dataFactura[2]}`
              )
              .then((res) => {
                const topcust = JSON.parse(res.data);
                for (var i = 0; i < topcust.data.length; i++) {
                  namesBar.push(topcust.data[i]["Customer"]);
                  priceBar.push(topcust.data[i]["Purchased Items"]);
                }
                for (i = 0; i < namesBar.length; i++) {
                  let obj1 = {};
                  obj1[keys[0]] = namesBar[i];
                  obj1[keys[1]] = priceBar[i];
                  bdata.push(obj1);
                }
                this.setState({ chart2data: bdata });
                this.setState({
                  chartDataBar: {
                    chart: {
                      type: "column",
                    },
                    colors: ["#242582"],
                    title: {
                      text: "Top 5 customers",
                    },
                    /* subtitle: {
                              text: "Source: WorldClimate.com"
                            }, */
                    xAxis: {
                      categories: namesBar,
                      crosshair: true,
                    },
                    yAxis: {
                      min: 0,
                      title: {
                        text: "Sale",
                      },
                    },
                    tooltip: {
                      headerFormat:
                        '<span style="font-size:10px">{point.key}</span><table>',
                      pointFormat:
                        '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                        '<td style="padding:0"><b>{point.y:.1f} mm</b></td></tr>',
                      footerFormat: "</table>",
                      shared: true,
                      useHTML: true,
                    },
                    plotOptions: {
                      column: {
                        pointPadding: 0.2,
                        borderWidth: 0,
                      },
                    },
                    series: [
                      {
                        data: this.state.chart2data,
                      },
                    ],
                  },
                });
                axios
                  //.get(`http://localhost:5000/xorai_analytics/factura/weekly`)
                  .get(
                    `http://localhost:${mainEndpoint}/${analytics[0]}/${subEndPoint[0]}/${dataFactura[3]}`
                  )
                  .then((res) => {
                    const weekly = JSON.parse(res.data);
                    for (var i = 0; i < weekly.data.length; i++) {
                      if (weekly.data[i]["year"] === 2019) {
                        weekly19.push(weekly.data[i]["amount"]);
                      } else if (weekly.data[i]["year"] === 2020) {
                        weekly20.push(weekly.data[i]["amount"]);
                      }
                    }
                    //weekly19 = weekly19.slice(0,10); // this reduces the array to first 10 elements
                    //weekly20 = weekly20.slice(0,10);
                    this.setState({
                      weeklychartData19: weekly19,
                      weeklychartData20: weekly20,
                    });
                    /* for( i = 0 ; i < namesMonthBar.length ; i++){
                                  let obj1 = {}
                                    obj1[keys[0]] = namesMonthBar[i];
                                    obj1[keys[1]] = priceMonthBar[i];
                                    monthdata.push(obj1);
                                
                                }
                                */
                    this.setState({
                      weeklychartLine: {
                        chart: {
                          type: "line",
                        },
                        title: {
                          text: "Weekly Sales Comparison",
                        },
                        colors: ["red", "blue"],
                        xAxis: {
                          categories: [
                            "week1",
                            "week2",
                            "week3",
                            "week4",
                            "week5",
                            "week6",
                            "week7",
                            "week8",
                            "week9",
                            "week10",
                            "week11",
                            "week12",
                            "week13",
                            "week14",
                            "week15",
                            "week16",
                            "week17",
                            "week18",
                            "week19",
                            "week20",
                            "week21",
                            "week22",
                            "week23",
                            "week24",
                            "week25",
                          ],
                        },
                        yAxis: {
                          title: {
                            text: "Sales",
                          },
                        },
                        plotOptions: {
                          line: {
                            dataLabels: {
                              enabled: false,
                            },
                            enableMouseTracking: true,
                          },
                        },
                        series: [
                          {
                            name: "2019",
                            data: this.state.weeklychartData19,
                          },
                          {
                            name: "2020",
                            data: this.state.weeklychartData20,
                          },
                        ],
                      },
                    });
                    axios
                      //.get(`http://localhost:5000/xorai_analytics/factura/monthly`)
                      .get(
                        `http://localhost:${mainEndpoint}/${analytics[0]}/${subEndPoint[0]}/${dataFactura[4]}`
                      )
                      .then((res) => {
                        const monthly = JSON.parse(res.data);
                        for (var i = 0; i < monthly.data.length; i += 2) {
                          sales19.push(monthly.data[i]["amount"]);
                        }
                        for (var j = 1; j < monthly.data.length; j += 2) {
                          sales20.push(monthly.data[j]["amount"]);
                        }

                        this.setState({
                          monthlychartData19: sales19,
                          monthlychartData20: sales20,
                        });
                        /* for( i = 0 ; i < namesMonthBar.length ; i++){
                                               let obj1 = {}
                                                 obj1[keys[0]] = namesMonthBar[i];
                                                 obj1[keys[1]] = priceMonthBar[i];
                                                 monthdata.push(obj1);
                                             
                                             }
                                             */
                        this.setState({
                          monthlychartBar: {
                            chart: {
                              type: "column",
                            },
                            colors: ["#5cdb95", "#05386b"],
                            title: {
                              text: "Monthly Sales Comparison",
                            },

                            xAxis: {
                              categories: [
                                "Jan",
                                "Feb",
                                "Mar",
                                "Apr",
                                "May",
                                "Jun",
                                "Jul",
                                "Aug",
                                "Sep",
                                "Oct",
                                "Nov",
                                "Dec",
                              ],
                            },
                            yAxis: {
                              title: {
                                text: "Sales",
                              },
                            },
                            plotOptions: {
                              line: {
                                dataLabels: {
                                  enabled: false,
                                },
                                enableMouseTracking: true,
                              },
                            },
                            series: [
                              {
                                name: "2019",
                                data: this.state.monthlychartData19,
                              },
                              {
                                name: "2020",
                                data: this.state.monthlychartData20,
                              },
                            ],
                          },
                        });

                        /********clover productsales bar chart******/

                        let clovitemsBar = [];
                        let clovnamesBar = [];
                        axios
                          //.get(`http://localhost:5000/clover_analytics/productsales`)
                          .get(
                            `http://localhost:${mainEndpoint}/${analytics[1]}/${dataClover[0]}`
                          )
                          .then((res) => {
                            const clovprodSalesBar = JSON.parse(res.data);
                            for (
                              var i = 0;
                              i < clovprodSalesBar.data.length;
                              i++
                            ) {
                              clovnamesBar.push(
                                clovprodSalesBar.data[i]["ProductName"]
                              );

                              clovitemsBar.push(
                                clovprodSalesBar.data[i]["Quantity Sold"]
                              );
                            }
                            this.setState({
                              clovBarNames: clovnamesBar,
                              clovBarQuantity: clovitemsBar,
                            });
                            this.setState({
                              cloverChartDataBar: {
                                chart: {
                                  type: "column",
                                  plotBackgroundColor: null,
                                  plotBorderWidth: null,
                                  plotShadow: false,
                                },
                                colors: ["#5cdb95", "#05386b"],

                                title: {
                                  text: "Comparison",
                                },

                                xAxis: {
                                  categories: this.state.clovBarNames,
                                },
                                yAxis: {
                                  title: {
                                    text: "Sales",
                                  },
                                },
                                plotOptions: {
                                  line: {
                                    dataLabels: {
                                      enabled: false,
                                    },
                                    enableMouseTracking: true,
                                  },
                                },
                                series: [
                                  {
                                    name: "2020",
                                    data: this.state.clovBarQuantity,
                                  },
                                ],
                              },
                            });
                            /***********end of clover prodsales*********/

                            /********clover productsales pie chart******/

                            axios
                              //.get( `http://localhost:5000/clover_analytics/productsales_var`)
                              .get(
                                `http://localhost:${mainEndpoint}/${analytics[1]}/${dataClover[1]}`
                              )
                              .then((res) => {
                                const clovprodSales = JSON.parse(res.data);
                                for (
                                  var i = 0;
                                  i < clovprodSales.data.length;
                                  i++
                                ) {
                                  clovnamesPie.push(
                                    clovprodSales.data[i]["Item_Name"]
                                  );
                                  clovvariation.push(
                                    clovprodSales.data[i]["Variation"]
                                  );
                                  clovitemsPie.push(
                                    clovprodSales.data[i]["Quantity_Sold"]
                                  );
                                }
                                for (i = 0; i < clovnamesPie.length; i++) {
                                  let obj2 = {};
                                  obj2[keys1[0]] =
                                    clovvariation[i] + " " + clovnamesPie[i];
                                  // obj2[keys1[0]] = clovvariation[i];
                                  obj2[keys1[1]] = clovitemsPie[i];
                                  clovdata.push(obj2);
                                }

                                this.setState({ clovchart1data: clovdata });
                                this.setState({
                                  cloverChartDataPie: {
                                    title: {
                                      text: "Product Sales Variations",
                                    },
                                    chart: {
                                      type: "pie",
                                      plotBackgroundColor: null,
                                      plotBorderWidth: null,
                                      plotShadow: false,
                                    },
                                    series: [
                                      {
                                        data: this.state.clovchart1data,
                                      },
                                    ],
                                  },
                                });
                              });
                            /******end of clove prodsales_var*****/
                          });
                      });
                  });
              });
          });
      });
  }

  /**************************************************end of data fetching**************************************************/

  render() {
    if (this.props.fact == 1) {
      return (
        <div>
          <Main
            chartDataPie={this.state.chartDataPie}
            chartDataBar={this.state.chartDataBar}
            monthlychartBar={this.state.monthlychartBar} // passing props to the main component that will be called in main.js
            weeklychartLine={this.state.weeklychartLine}
            yearPie={this.state.yearPie}
          />
        </div>
      );
    } else if (this.props.clov == 1) {
      return (
        <div>
          <Main
            clovpropsdata={this.state.clovpropsdata}
            cloverChartDataBar={this.state.cloverChartDataBar}
            cloverChartDataPie={this.state.cloverChartDataPie}
          />
        </div>
      );
    } else {
      return (
        <div>
          <Main
            chartDataPie={this.state.chartDataPie}
            chartDataBar={this.state.chartDataBar}
            monthlychartBar={this.state.monthlychartBar} // passing props to the main component that will be called in main.js
            weeklychartLine={this.state.weeklychartLine}
            yearPie={this.state.yearPie}
            cloverChartDataPie={this.state.cloverChartDataPie}
          />
        </div>
      );
    }
  }
}


export default Chart;