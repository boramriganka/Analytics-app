import React from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import PieChart from "highcharts-react-official";
import Chart from "./Chart";
import '../../../styles/main.css'

class Main extends React.Component {
  constructor(props) {
    super(props);
  }

  addItem() {
    //this.props.dispatch(actions.createL2ProfileItem());
  }
  render() {
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
              <div className="bottom">$325800.72</div>
            </div>
            <div className="panel-tile blue">
              <div className="top">Products Sold</div>
              <div className="bottom">10500</div>
            </div>
            <div className="panel-tile red ">
              <div className="top">Refund/Cancel</div>
              <div className="bottom">$32580.72</div>
            </div>
            <div className="panel-tile pink">
              <div className="top">Store Visits</div>
              <div className="bottom">4506</div>
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
        
          </div>
          {/* <div>
            <label for={this.props.dashboard.formData.CustomerName.id}>
              {this.props.dashboard.formData.CustomerName.label}
            </label>
            <input
              type="text"
              value={this.props.dashboard.formData.CustomerName.value}
              id={this.props.dashboard.formData.CustomerName.id}
              onChange={e => {
                this.props.onNameChange(e);
              }}
            />
            <a onClick={() => this.props.addItem()}>Add Item</a>
          </div> */}
        </div>
        </section>
    );
  }
}

export default Main;
