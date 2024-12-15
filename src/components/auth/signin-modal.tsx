tsx;
import { useAuth } from "@/hooks/use-auth";
import {
  login,
  register,
  reverifyEmail,
} from "@/services/dispatch/user-dispatch";
import { saveSession, setItem } from "@/services/session";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
} from "@nextui-org/react";
import { useFormik } from "formik";
import { Key, useState, useMemo } from "react";
import toast from "react-hot-toast";
import * as Yup from "yup";

type P = {
  isOpen: boolean;
  onClose: () => void;
  onSignupSuccess: (message: string) => void;
};

const validationSchemas = {
  login: Yup.object().shape({
    email: Yup.string()
      .email("Invalid email format")
      .required("Email is required"),
    password: Yup.string()
      .min(3, "Password must be at least 3 characters long")
      .required("Password is required"),
  }),
  signup: Yup.object().shape({
    full_name: Yup.string()
      .min(3, "Full name must be at least 3 characters long")
      .required("Full name is required"),
    email: Yup.string()
      .email("Invalid email format")
      .required("Email is required"),
    password: Yup.string()
      .min(3, "Password must be at least 3 characters long")
      .required("Password is required"),
  }),
};

const SigninModal = ({ isOpen, onClose, onSignupSuccess }: P) => {
  const [selectedKey, setSelectedKey] = useState("login");
  const [loadingState, setLoadingState] = useState({
    loading: false,
    error: null,
  });
  const { setUser, setIsLoggedIn } = useAuth();
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  const formik = useFormik({
    initialValues:
      selectedKey === "login"
        ? { email: "", password: "" }
        : { full_name: "", email: "", password: "" },
    validationSchema: validationSchemas[selectedKey],
    enableReinitialize: true,
    onSubmit: async (values) => {
      setLoadingState({ loading: true, error: null });
      try {
        const res =
          selectedKey === "login"
            ? await login(values)
            : await register(values);
        if (selectedKey === "login") {
          setUser(res.user);
          setIsLoggedIn(true);
          saveSession({ accessToken: res.access, refreshToken: res.refresh });
          setItem("user", res.user);
          toast.success("Login successful");
        } else {
          setShowVerificationModal(true);
          onSignupSuccess("Registration successful! Please verify your email.");
        }
        onClose();
      } catch (err) {
        handleApiError(err);
      } finally {
        setLoadingState({ loading: false, error: null });
      }
    },
  });

  const handleApiError = (err: any) => {
    const { response } = err;
    if (!response) {
      setLoadingState((prev) => ({
        ...prev,
        error: "Network error. Please check your connection and try again.",
      }));
      return;
    }
    const { status, data } = response;
    if (data?.email?.[0]) {
      const emailError = data.email[0];
      if (emailError.includes("already exists and is verified")) {
        setLoadingState((prev) => ({
          ...prev,
          error: "This email is already registered. Please login instead.",
        }));
        setTimeout(() => setSelectedKey("login"), 1500);
      } else if (emailError.includes("already registered but not verified")) {
        setUnverifiedEmail(formik.values.email);
        setLoadingState((prev) => ({
          ...prev,
          error:
            "This email is registered but not verified. Click below to resend verification email.",
        }));
      } else {
        setLoadingState((prev) => ({ ...prev, error: emailError }));
      }
      return;
    }
    switch (status) {
      case 400:
        if (selectedKey === "login" && data?.detail?.includes("not found")) {
          setLoadingState((prev) => ({
            ...prev,
            error: "Email not registered. Please sign up first.",
          }));
          setTimeout(() => setSelectedKey("signup"), 1500);
        } else {
          setLoadingState((prev) => ({
            ...prev,
            error: data.message || "Please check your input and try again.",
          }));
        }
        break;
      case 401:
        setLoadingState((prev) => ({
          ...prev,
          error: "Incorrect email or password. Please try again.",
        }));
        break;
      case 422:
        setLoadingState((prev) => ({
          ...prev,
          error: "Invalid input format. Please check your details.",
        }));
        break;
      case 429:
        setLoadingState((prev) => ({
          ...prev,
          error: "Too many attempts. Please try again later.",
        }));
        break;
      default:
        setLoadingState((prev) => ({
          ...prev,
          error: "An unexpected error occurred. Please try again later.",
        }));
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResendingEmail(true);
    try {
      await reverifyEmail({ email: unverifiedEmail });
      toast.success(
        "Verification email has been resent. Please check your inbox."
      );
      setShowVerificationModal(true);
    } catch {
      toast.error("Failed to resend verification email. Please try again.");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleClose = () => {
    formik.resetForm();
    setLoadingState({ loading: false, error: null });
    setUnverifiedEmail(null);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        hideCloseButton
        className="backdrop-blur-sm"
      >
        <ModalContent>
          <ModalHeader>
            <Tabs
              fullWidth
              aria-label="Options"
              selectedKey={selectedKey}
              onSelectionChange={setSelectedKey as (key: Key) => void}
              color="primary"
              radius="lg"
              size="lg"
            >
              <Tab key="login" title="Login" className="text-lg py-6" />
              <Tab key="signup" title="Sign Up" className="text-lg py-6" />
            </Tabs>
          </ModalHeader>
          <ModalBody>
            <form
              className="flex flex-col gap-4"
              onSubmit={formik.handleSubmit}
            >
              {selectedKey === "signup" && (
                <Input
                  placeholder="Full Name"
                  size="lg"
                  {...formik.getFieldProps("full_name")}
                  isInvalid={
                    formik.touched.full_name && Boolean(formik.errors.full_name)
                  }
                  errorMessage={formik.errors.full_name}
                />
              )}
              <Input
                placeholder="Email"
                size="lg"
                {...formik.getFieldProps("email")}
                isInvalid={formik.touched.email && Boolean(formik.errors.email)}
                errorMessage={formik.errors.email}
              />
              <Input
                placeholder="Password"
                size="lg"
                type="password"
                {...formik.getFieldProps("password")}
                isInvalid={
                  formik.touched.password && Boolean(formik.errors.password)
                }
                errorMessage={formik.errors.password}
              />
              {loadingState.error && (
                <p className="text-danger text-sm font-medium px-2">
                  {loadingState.error}
                </p>
              )}
              {unverifiedEmail && (
                <Button
                  size="lg"
                  color="secondary"
                  onClick={handleResendVerification}
                  isLoading={resendingEmail}
                >
                  Resend Verification Email
                </Button>
              )}
              <Button
                size="lg"
                color="primary"
                type="submit"
                isLoading={loadingState.loading}
              >
                {selectedKey === "login" ? "Let's Go" : "Join Now"}
              </Button>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
      {showVerificationModal && (
        <Modal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          className="backdrop-blur-xl"
          size="lg"
        >
          <ModalContent className="w-[80%] mx-auto p-8 rounded-lg shadow-lg">
            <ModalHeader>
              <h2 className="text-3xl font-bold">Verify your email address</h2>
            </ModalHeader>
            <ModalBody>
              <p>
                Please check your email and click the verification link to
                activate your account.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                size="lg"
                color="primary"
                onClick={() => window.open("https://mail.google.com", "_blank")}
              >
                Open Email
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

export default SigninModal;
