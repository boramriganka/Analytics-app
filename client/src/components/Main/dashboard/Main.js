import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import PieChart from "highcharts-react-official";
import LineChart from "highcharts-react-official";
import axios from "axios";
import "../../../styles/main.css";

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      Total_Sales: 0,
      Product_Sold: 0,
      Refund: 0,
      Store_visits: 0,
    };
  }
  componentDidMount() {
    let totalquantity = [];
    let totalsale = [];
    let visit = [];
    let reefund = [];
    let mainEndpoint = "5050";
    let analytics = ["xorai_analytics", "clover_analytics"];
    let subEndPoint = ["factura", "clover"];
    let dataFactura = [
      "total_quantity",
      "total_sale",
      "Noofcustomer",
      "refund",
    ];

    /**total quantity **/
    console.log(`http://localhost:5000/xorai_analytics/factura/productsales`);
    axios
      .get(`http://localhost:${mainEndpoint}/${analytics[0]}/${subEndPoint[0]}/${dataFactura[0]}`)
      .then((res) => {
        const quantity = JSON.parse(res.data);
        for (var i = 0; i < quantity.data.length; i++) {
          totalquantity.push(quantity.data[i]["total quantity"]);
        }

        this.setState({ Product_Sold: totalquantity });

        /** total sales **/

        axios
          .get(`http://localhost:${mainEndpoint}/${analytics[0]}/${subEndPoint[0]}/${dataFactura[1]}`)
          .then((res) => {
            const sale = JSON.parse(res.data);
            for (var i = 0; i < sale.data.length; i++) {
              totalsale.push(sale.data[i]["total sale"]);
            }

            this.setState({ Total_Sales: totalsale });

            /** no.of customers **/

            axios
              .get(`http://localhost:${mainEndpoint}/${analytics[0]}/${subEndPoint[0]}/${dataFactura[2]}`)
              .then((res) => {
                const storevisits = JSON.parse(res.data);
                for (var i = 0; i < storevisits.data.length; i++) {
                  visit.push(storevisits.data[i]["customer"]);
                }
                this.setState({ Store_visits: visit });

                /**refunds**/

                axios
                  .get(`http://localhost:${mainEndpoint}/${analytics[0]}/${subEndPoint[0]}/${dataFactura[3]}`)
                  .then((res) => {
                    const refund = JSON.parse(res.data);
                    for (let i = 0; i < refund.data.length; i++) {
                      reefund.push(refund.data[i]["refund"]);
                    }
                    this.setState({ Refund: reefund });
                  });
              });
          });
      });
  }


  render() {
    const { Total_Sales, Product_Sold, Refund, Store_visits } = this.state;
    if (this.props.clovpropsdata == 0) {
      return (
        <section id="body" className="mainSection">
          <div className="headerHeight">
            <div className="headerLayout">
              {/* <div className="headerIcon">
                <i class="material-icons ng-binding">computer</i>
              </div> */}
              <div id="name_parent_child" className="headerTitle bold">
                <span className="ng-binding">Dashboard|</span>
                <span
                  ng-if="headerInfo.child != (breadcrumbStates[0].title).toUpperCase()"
                  className="ng-binding ng-scope"
                >
                  My Dashboard
                </span>
              </div>
              {/* <div>
                <ul>
                  <li>main</li>
                </ul>
              </div> */}
            </div>
          </div>
          <div className="secondDivHeight">
            <div className="secondDivLayoutLeft">My Business Snapshot</div>
            <div className="secondDivLayoutRight">
              <select name="" id="input">
                <option>Last Month</option>
                <option value="">Last Week</option>
                <option value="">Last Year</option>
              </select>
            </div>
          </div>
          <div className="fullWidth">
            <div className="panel-top">
              <div className="panel-tile green">
                <div className="top">Sales</div>
                <div className="bottom">${Total_Sales}</div>
              </div>
              <div className="panel-tile blue">
                <div className="top">Products Sold</div>
                <div className="bottom">{Product_Sold}</div>
              </div>
              <div className="panel-tile red ">
                <div className="top">Refund/Cancel</div>
                <div className="bottom">${Refund}</div>
              </div>
              <div className="panel-tile pink">
                <div className="top">Store Visits</div>
                <div className="bottom">{Store_visits}</div>
              </div>

              <div className="col-lg-12">
                <div className="tile">
                  <PieChart
                    highcharts={Highcharts}
                    options={this.props.cloverChartDataPie}
                  />
                </div>
                <div className="devider-vertical"></div>
                <div className="tile">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={this.props.cloverChartDataBar}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    } else {
      return (
        <section id="body" className="mainSection">
          <div className="headerHeight">
            <div className="headerLayout">
              {/* <div className="headerIcon">
              <i class="material-icons ng-binding">computer</i>
            </div> */}
              <div id="name_parent_child" className="headerTitle bold">
                <span className="ng-binding">Dashboard|</span>
                <span
                  ng-if="headerInfo.child != (breadcrumbStates[0].title).toUpperCase()"
                  className="ng-binding ng-scope"
                >
                  My Dashboard
                </span>
              </div>
              {/* <div>
              <ul>
                <li>main</li>
              </ul>
            </div> */}
            </div>
          </div>
          <div className="secondDivHeight">
            <div className="secondDivLayoutLeft">My Business Snapshot</div>
            <div className="secondDivLayoutRight">
              <select name="" id="input">
                <option>Last Month</option>
                <option value="">Last Week</option>
                <option value="">Last Year</option>
              </select>
            </div>
          </div>
          <div className="fullWidth">
            <div className="panel-top">
              <div className="panel-tile green">
                <div className="top">Sales</div>
                <div className="bottom">${Total_Sales}</div>
              </div>
              <div className="panel-tile blue">
                <div className="top">Products Sold</div>
                <div className="bottom">{Product_Sold}</div>
              </div>
              <div className="panel-tile red ">
                <div className="top">Refund/Cancel</div>
                <div className="bottom">${Refund}</div>
              </div>
              <div className="panel-tile pink">
                <div className="top">Store Visits</div>
                <div className="bottom">{Store_visits}</div>
              </div>

              <div className="col-lg-12">
                <div className="tile">
                  <PieChart
                    highcharts={Highcharts}
                    options={this.props.chartDataPie}
                  />
                </div>
                <div className="devider-vertical"></div>
                <div className="tile">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={this.props.chartDataBar}
                  />
                </div>
              </div>
              <div className="col-lg-12">
                <div className="tile">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={this.props.monthlychartBar}
                  />
                </div>
                <div className="devider-vertical"></div>
                <div className="tile">
                  <LineChart
                    highcharts={Highcharts}
                    options={this.props.weeklychartLine}
                  />
                </div>
              </div>

              <div className="col-lg-12">
                <div className="tile">
                  <PieChart
                    highcharts={Highcharts}
                    options={this.props.yearPie}
                  />
                </div>
                <div className="devider-vertical"></div>
                <div className="tile"></div>
              </div>
            </div>
          </div>
        </section>
      );
    }
  }
}
export default Main;
