import { Component } from 'react';
import Button from './Button.jsx';
import './ui.css';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <span className="error-boundary__icon">😕</span>
          <h2 className="error-boundary__title">Что-то пошло не так</h2>
          <p className="error-boundary__desc">
            Произошла непредвиденная ошибка. Попробуйте обновить страницу.
          </p>
          <Button variant="primary" onClick={this.handleReset}>
            Попробовать снова
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
