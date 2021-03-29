// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint-disable react/require-default-props */
import GoogleLogin from "react-google-login";
import { Row, Col } from 'antd';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import * as jaegerApiActions from '../../actions/jaeger-api';
import GoogleButton from 'react-google-button';
import JaegerAPI from '../../api/jaeger';

import React, { Component } from 'react';
import { RouteComponentProps, Router as RouterHistory, withRouter } from 'react-router-dom';
import { getConfigValue } from '../../utils/config/get-config';
import { ReduxState } from '../../types';

type Props = RouteComponentProps<any> & {
	history: RouterHistory;
};
type State = { loginFailed: boolean };
// export for tests

type TOwnProps = RouteComponentProps<any> & {
  history: RouterHistory;
	location: Location;
};

type TDispatchProps = {
  validateUser: () => void;
};

type TReduxProps = {
  lookback: number;
  service?: string;
  services?: string[] | null;
};

type TValidUser={
	isValid?:boolean;
}
export type TProps = TDispatchProps & TReduxProps & TOwnProps;

type TState = {
	loginFailed: boolean;
  validUser?: TValidUser;
  error?: Error;
  loading?: boolean;
};

export class Login   extends React.PureComponent<TProps, TState> {

	constructor(props: TProps) {
		super(props);
		this.onSuccess = this.onSuccess.bind(this);
		this.checkLoginStatus();
		this.setState({ loginFailed: true });

	}


	checkLoginStatus() {
		if (localStorage.getItem('userId')) {
			this.props.history.push('/search');
		}
	}

	onSuccess( googleAccountData: any) {
		const { history } = this.props;
		JaegerAPI.validateUser(googleAccountData.profileObj.email)
      .then((resp: boolean) => {
     localStorage.setItem('userId', googleAccountData.profileObj.email);
		 history.push('/search');
      })
      .catch((error: Error) => {
				console.log(error);
				this.setState({
								'loginFailed': true
							});	
      });
	}
	onFail(err: any) {
		console.log(err);
	}


	render() {
		console.log(getConfigValue('googleClientUrl'));
		return (

			<Row type="flex" className="LoginPage">
				{/* <p>{this.state && this.state.errorMsg}</p> */}
				<Row className="heading">Haystack Traces UI </Row>
				<Row type="flex">
					<GoogleLogin
						clientId={getConfigValue('googleClientUrl')}
						//clientId="621596295553-cpj7lrlteaa12jtgbdscdktk44jdiimh.apps.googleusercontent.com"
						render={renderProps => (
							<GoogleButton
								className="googleButton"
								onClick={renderProps.onClick}
							>
								Log in with Google
              </GoogleButton>
						)}
						onSuccess={this.onSuccess}
						onFailure={this.onFail}
					/>
				</Row>
				{this.state && this.state.loginFailed ?
					<Row type="flex">
						<Col className="warning">Please raise request for access. Contact #haystack-help</Col>
					</Row> : true}

			</Row>
		);
	}
}

export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { validateUser } = bindActionCreators(jaegerApiActions, dispatch);

  return {
    validateUser
  };
}

export default connect(
	  mapDispatchToProps
)(Login);








