import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    label?: string;
}
interface State {
    error: Error | null;
}

/** Catches render errors in a subtree so one bad component can't blank the app. */
class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error) {
        console.error('[ErrorBoundary]', this.props.label ?? '', error);
    }

    render() {
        if (this.state.error) {
            return (
                <div className='flex min-h-[40vh] flex-col items-center justify-center p-6 text-center'>
                    <div className='mb-3 text-3xl'>⚠️</div>
                    <h2 className='text-lg font-bold text-white'>Something went wrong here</h2>
                    <p className='mt-2 max-w-md text-sm text-slate-400'>{this.state.error.message}</p>
                    <button className='btn-ghost mt-5' onClick={() => this.setState({ error: null })}>
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
