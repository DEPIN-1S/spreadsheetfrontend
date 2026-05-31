import React, { useState } from 'react';
import { FiPhone, FiKey, FiArrowRight, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import { LuFileSpreadsheet } from 'react-icons/lu';
import apiClient from '../api/apiClient';
const FloatingCharacters = () => {
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901234567890+−×÷₹+−×÷₹';
    const [elements, setElements] = React.useState([]);

    React.useEffect(() => {
        const newItems = Array.from({ length: 60 }).map((_, i) => ({
            id: i,
            char: characters.charAt(Math.floor(Math.random() * characters.length)),
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            fontSize: `${Math.floor(Math.random() * 24) + 16}px`, // 16px to 40px
            opacity: Math.random() * 0.15 + 0.05, // 0.05 to 0.20
            animationDuration: `${Math.floor(Math.random() * 15) + 15}s`, // 15s to 30s
            animationDelay: `-${Math.random() * 30}s`, // Start staggered
        }));
        setElements(newItems);
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <style>{`
                @keyframes float-chars {
                    0% { transform: translateY(0px) rotate(0deg); opacity: 0; }
                    10% { opacity: var(--tw-op); }
                    90% { opacity: var(--tw-op); }
                    100% { transform: translateY(-300px) rotate(45deg); opacity: 0; }
                }
            `}</style>
            {elements.map((item) => (
                <div
                    key={item.id}
                    className="absolute font-bold text-teal-400 select-none"
                    style={{
                        left: item.left,
                        top: item.top,
                        fontSize: item.fontSize,
                        '--tw-op': item.opacity,
                        animation: `float-chars ${item.animationDuration} infinite linear ${item.animationDelay}`,
                    }}
                >
                    {item.char}
                </div>
            ))}
        </div>
    );
};

export default function Login({ setActivePath }) {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1 = Phone, 2 = OTP
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        if (phone.length < 10) {
            setError('Please enter a valid 10-digit phone number.');
            return;
        }
        setLoading(true);
        try {
            await apiClient.post('/user/send-otp', { phone });
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await apiClient.post('/user/verify-otp', { phone, otp });
            if (response.data?.data?.accessToken) {
                // Successful login
                localStorage.setItem('accessToken', response.data.data.accessToken);
                if (response.data.data.refreshToken) {
                    localStorage.setItem('refreshToken', response.data.data.refreshToken);
                }
                if (response.data.data.user) {
                    localStorage.setItem('user', JSON.stringify(response.data.data.user));
                }
                setActivePath('/my-files');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP. Please check and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white font-sans w-full">
            {/* Left Panel */}
            <div className="hidden lg:flex flex-col justify-center w-1/2 bg-[#0F172A] text-white p-16 relative overflow-hidden">
                <FloatingCharacters />

                <div className="relative z-10 max-w-xl mx-auto w-full">
                    <div className="flex items-center gap-4 mb-14">
                        <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20 text-white">
                            <LuFileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h1 className="font-bold text-2xl tracking-tight">Datsheets</h1>
                            <p className="text-sm text-gray-400">Enterprise Desk</p>
                        </div>
                    </div>

                    <h2 className="text-5xl font-extrabold font-sans leading-tight mb-6">
                        Streamlined<br />Enterprise<br />Management
                    </h2>

                    <p className="text-gray-400 text-lg mb-12 max-w-md">
                        Manage your files, users, and documents efficiently with our integrated enterprise solution.
                    </p>

                    <div className="space-y-6">
                        <div className="flex items-center gap-5">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                            <p className="text-gray-200 font-medium">Secure file storage & seamless sharing</p>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                            <p className="text-gray-200 font-medium">Real-time team communication</p>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                            <p className="text-gray-200 font-medium">Advanced document editing & tracking</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md bg-[#F4F6FF] rounded-4xl p-10 shadow-sm border border-indigo-50/50 relative overflow-hidden">
                    {/* Subtle decoration in the box */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>

                    <div className="relative z-10">
                        <div className="text-center mb-8 relative">
                            {step === 2 && (
                                <button 
                                    onClick={() => { setStep(1); setError(''); setOtp(''); }} 
                                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 p-2 transition-colors"
                                >
                                    <FiArrowLeft size={20} />
                                </button>
                            )}
                            <h2 className="text-[28px] font-bold text-[#0F172A] mb-3">Welcome Back!</h2>
                            <p className="text-gray-500 text-sm">
                                {step === 1 ? 'Log in using your phone number' : `Enter the OTP sent to ${phone}`}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center">
                                {error}
                            </div>
                        )}

                        {step === 1 ? (
                            <form onSubmit={handleSendOtp} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Phone Number
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <FiPhone className="text-gray-400" size={18} />
                                        </div>
                                        <input
                                            type="tel"
                                            className="block w-full pl-11 pr-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all shadow-sm text-gray-900 font-medium"
                                            placeholder="Enter 10 digit number"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || phone.length < 5}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 group shadow-md shadow-indigo-600/20 mt-4"
                                >
                                    {loading ? 'Sending OTP...' : 'Send Login Code'}
                                    <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        One Time Password (OTP)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <FiKey className="text-gray-400" size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full pl-11 pr-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all shadow-sm text-gray-900 font-medium tracking-widest"
                                            placeholder="Enter 4-digit code"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otp.length < 4}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 group shadow-md shadow-indigo-600/20 mt-4"
                                >
                                    {loading ? 'Verifying...' : 'Verify & Login'}
                                    <FiCheckCircle className="transition-transform" />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
